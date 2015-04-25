var _ = require('lodash');

module.exports = function (robot) {
  robot.hear(/(--ghuser|github-username): @(.*)/i, function (res) {
    console.log(res.match);
    var user = res.message.user;
    user.channel = res.message.rawMessage.channel;
    var getLangs = function (languages) {
      return {
        langs: languages,
        setLangs: function (user) {
          user.languages = this.langs;
          return user;
        }
      };
    };
    var languages = [];

    var url = 'https://api.github.com/users/' + res.match[2] + '/repos';
    console.log(url);
    robot.http(url)
    .get()(function (err, resp, body) {
      if(err) {
        console.log('Couldn\'t fetch github repos.');
        return err;
      }
      var i, repos = JSON.parse(body);

      for(i = 0; i < repos.length; i++) {
        languages.push(repos[i].language);
      }
      languages = _.uniq(languages);
      getLangs(languages);
      res.send('I found these skills - `' + languages.toString().replace(/,/g, ', ') + '`');
      getLangs().setLangs(user);
      console.log(user);
      console.log('\nInside HTTP');
    });
    console.log('\nOutside HTTP - ', user);
  });
  
  robot.hear(/\q\: (.*) #\[(.*)\]/i, function (res) {
    console.log(res.match);
    var user = JSON.stringify({
      id: res.message.user.id,
      body: res.match[1],
      tags: res.match[2]
    });

    robot.http('http://yodabot-api.herokuapp.com/questions')
    .headers({'Content-Type': 'application/json'})
    .post(user)(function (err, res, body) {
      console.log(err);
      if(err) {
        console.log('Encountered an error - ' + err);
        return;
      }
      console.log('Successfully sent question!');
      res.user = user;
    });

    res.send('Thank you for your question.\nI will let you know as soon as there\'s any response to your question.');
  });

  robot.router.post('/experts', function (req, res) {
    var experts = req.body;
    console.log(experts);
    robot.messageRoom('yoda-masters', 'Here are the experts: ' + experts.user.slack);
    res.end('Data received by Master Yoda');
  });

  var yodaMaster = {
    getGroupMembers: function() {
      robot.http('https://slack.com/api/groups.list?token=xoxp-2853699384-2973559118-3689875758-4bb292')
      .get()(function (err, res, body) {
        if(err) {
          console.log('Encountered an error!');
          return;
        }
        var req = JSON.parse(body);

        for(var i = 0; i < req.groups.length; i++) {
          if(req.groups[i].id === 'G04F44C29') {
            var group = req.groups[i];

            for(var j = 0; j < group.members.length; j++) {
              if(group.members[j] !== 'U04EFU4CA') {

                var checkRoomUrl = 'https://slack.com/api/im.open?token=xoxb-4491956418-LUBmGhLmi2Mve6KJzOYZZvGV&user=' + group.members[j];

                robot.http(checkRoomUrl)
                .get()(function (err, res, body) {
                  if(err) {
                    return err;
                  }
                  var im = JSON.parse(body);
                  console.log(im);
                  var text = 'Give me your github username in this format - `--ghuser: @username`';
                  var url = 'https://slack.com/api/chat.postMessage?token=xoxb-4491956418-LUBmGhLmi2Mve6KJzOYZZvGV&';
                  url += 'channel=' + im.channel.id + '&as_user=true&text=' + text;
                  console.log(url);
                  robot.http(url)
                  .post()(function (error, res, data) {
                   if(error) {
                     return error;
                   }
                   console.log(data);
                  });
                });
              }
            }
          }
        }
      });
    }
  };

  robot.respond(/#blocks/i, function (res) {
     var url = 'https://knowledgebot.firebaseio.com/questions.json';
     robot.http(url)
        .get()(function (err, resp, body) {
            if(err) {
          console.log('Encountered an error!');
          return;
            }
        var questions = JSON.parse(body);
        var keys = Object.keys(questions),
        len = keys.length - 10,
        i = keys.length - 1,
        question_id,
        question;
        res.send('The last 10 questions are;');
        while (i > len) {
          if (keys[i]) {
           question_id = keys[i];
           question = questions[question_id];
           res.send('#' + question_id + '--------' + question.body);
         }
           i -= 1;
        }
      

        });

  });

  robot.hear(/\a\: (.*) #(.*)/i, function (res) {
    res.send('Wonderful mind!.\nLet\'s see if what you bring in makes you a master or an apprentice still.');
    console.log(res.match);
    var answer = JSON.stringify({
      id: res.message.user.id,
      name: res.message.user.name,
      email_address: res.message.user.email_address,
      content: res.match[1],
      question_id: res.match[2]
    });

    robot.http('http://yodabot-api.herokuapp.com/answers')
    .headers({'Content-Type': 'application/json'})
    .post(answer)(function (err, res, body) {
      console.log(err);
      // console.log('\n', res);
      // console.log('\nThis is the body of the POST ' + body);
      if(err) {
        console.log('Encountered an error - ' + err);
        return;
      }
      console.log('Successfully sent data!');
      res.answer = answer;
    });
    var url = 'https://knowledgebot.firebaseio.com/questions/' + JSON.parse(answer).question_id + '.json';
    console.log(url);
    robot.http(url)
      .get()(function (err, res, body) {
        if(err) {
          console.log('Encountered an error!');
          return;
        }
        var apprenticeId = JSON.parse(body).userId;
        var msgAnswer = 'https://slack.com/api/chat.postMessage?token=xoxb-4491956418-LUBmGhLmi2Mve6KJzOYZZvGV&';
        msgAnswer += 'channel=' + apprenticeId + '&username=yodabot&text=' + JSON.parse(answer).content;
        robot.http(msgAnswer)
        .post()(function (err, res, body) {
          if(err) {
            return err;
          }
        });
      });


  });
  yodaMaster.getGroupMembers();
};
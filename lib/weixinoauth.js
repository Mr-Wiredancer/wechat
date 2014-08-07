var requestify = require('requestify');
var url = require('url');

function getOpenID(appid, appsecret, code, response) {
  var OAUTH_API = "https://api.weixin.qq.com/sns/oauth2/access_token"
              + "?appid=" + appid
              + "&secret=" + appsecret
              + "&code=" + code
              + "&grant_type=authorization_code";

  requestify.get(OAUTH_API).then(function(res) {
    response.send(res.body);
  });
}

module.exports = function(appid, appsecret) {
  // should use bodyParser before this
  return function(req, res) {

    if (req.method === 'POST') {
      var code = req.body.code;
      getOpenID(appid, appsecret, code, res);

    } else if (req.method === 'GET') {
      var code = req.query.code;
      getOpenID(appid, appsecret, code, res);
    } else {
      res.send("Invalid HTTP request type");
    }
  }
}

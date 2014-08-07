var WechatMessage = require('./lib/wechat-message.js')
    , wechatHelper = require('./lib/wechat-message-builder.js')
    , wechatAuth = require('./lib/weixinauth.js')
    , wechatOAuth = require('./lib/weixinoauth.js');


module.exports = {
    'WechatMessage': WechatMessage, //class of a wechat message
    'wechatHelper': wechatHelper, //generates an express middleware that process wechat messages
    'wechatAuth': wechatAuth,
    'wechatOAuth': wechatOAuth
    };

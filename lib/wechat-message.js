var requestify = require('requestify')
	, async = require('async')
	, request = require('request')
	, Js2Xml = require('js2xml').Js2Xml;

// types of wechat message
var TEXTTYPE = 'text',
	VOICETYPE = 'voice',
	VIDEOTYPE = 'video',
	LOCATIONTYPE = 'location',
	LINKTYPE = 'link',
	EVENTYPE = 'event',
	IMAGETYPE = 'image',
	NEWSTYPE = 'news',
	MUSICTYPE = 'music';

// constructor: copy elements in data into the new instance
var WechatMessage = function(data, db) {
	for (var key in data) {
		var d = data[key];
		this[key] = d.substr ? d : d[0];
	}
	this.db = db;
};

/************************* Type checker *******************************/
/**
 * [isText description]
 * @param  {String}  text 若不为空，则将Content字段与text进行匹配
 * @return {Boolean}
 */
WechatMessage.prototype.isText = function(text) {
	return this.MsgType === TEXTTYPE && ((text===undefined)?true:(this.Content===text));
};

WechatMessage.prototype.isVoice = function() {
	return this.MsgType === VOICETYPE;
};

WechatMessage.prototype.isRecognizedVoice = function() {
	return this.isVoice() && this.Recognition;
};

WechatMessage.prototype.isImage = function() {
	return this.MsgType === IMAGETYPE;
};

WechatMessage.prototype.isVideo = function() {
	return this.MsgType === VIDEOTYPE;
};

WechatMessage.prototype.isEvent = function() {
	return this.MsgType === EVENTYPE;
};

WechatMessage.prototype.isMusic = function() {
	return this.MsgType === MUSICTYPE;
};

WechatMessage.prototype.isNews = function() {
	return this.MsgType === NEWSTYPE;
};

WechatMessage.prototype.isLink = function() {
	return this.MsgType === LINKTYPE;
};

WechatMessage.prototype.isLocation = function() {
	return this.MsgType === LOCATIONTYPE;
};

WechatMessage.prototype.isNormalMessage = function() {
	return this.isText() || this.isVoice() || this.isImage() || this.isVideo() || this.isLink() || this.isLocation();
}

//event type
WechatMessage.prototype.isSubscribeEvent = function() {
	return this.isEvent() && this.Event === 'subscribe';
};

WechatMessage.prototype.isPureSubscribeEvent = function() {
	return this.isSubscribeEvent && !this.EventKey;
};

WechatMessage.prototype.isUnsubscribeEvent = WechatMessage.prototype.isPureUnsubscribeEvent = function() {
	return this.isEvent() && this.Event === 'unsubscribe';
};

WechatMessage.prototype.isScanBeforeSubscribeEvent = function() {
	return this.isSubscribeEvent() && this.EventKey && this.Ticket;
};

WechatMessage.prototype.isScanAfterSubscribeEvent = function() {
	return this.isEvent() && this.Event === 'SCAN' && this.EventKey && this.Ticket;
};

WechatMessage.prototype.isLocationEvent = function() {
	return this.isEvent() && this.Event === 'LOCATION';
};

/**
 * [isClickEvent description]
 * @param  {String}  eventKey 若不为空，则将EventKey字段与text进行匹配
 * @return {Boolean}
 */
WechatMessage.prototype.isClickEvent = function(eventKey) {
	return this.isEvent() && this.Event === 'CLICK' && ((eventKey===undefined)?true:(this.EventKey===eventKey));
};

/************************* Formatter *******************************/

WechatMessage.prototype.toXML = function() {
	var result = new Js2Xml('xml', this);
	return result.toString();
};

//seems redundant
WechatMessage.prototype.toFormatJSON = function() {
	return JSON.stringify(this);
};

/************************* Message maker ******************************
 ************************** For internal use ***************************/


// mapping JSON names to XML names
var XMLNames = {
	"media_id": "MediaId",
	"title": "Title",
	"description": "Description",
	"musicurl": "MusicUrl",
	"hqmusicurl": "HQMusicUrl",
	"thumb_media_id": "ThumbMediaId",
	"picurl": "PicUrl",
	"url": "Url"
};

// mapping XML names to JSON names
var JSONNmes = {
	"MediaId": "media_id",
	"Title": "title",
	"Description": "description",
	"MusicUrl": "musicurl",
	"HQMusicUrl": "hqmusicurl",
	"ThumbMediaId": "thumb_media_id",
	"PicUrl": "picurl",
	"Url": "url"
};

/**
 * KeFu message maker
 *
 * @param type {String} type of message
 * @param content {Object} content of the message in JSON format,
 	should conform to the docs
 * @param touser {String} open id of the recipient
 * @return {Object} built message, ready to be converted to JSON
 */
WechatMessage.prototype.makeKeFuMessage = function(type, content, touser) {
	var msg = new WechatMessage();
	msg.touser = touser
	msg.msgtype = type;
	if (type != 'news')
		msg[type] = content;
	else
		msg[type] = {'articles': content};
	return msg;
};

/**
 * response message maker
 *
 * @this the message to respond
 * @param type {String} type of message
 * @param content {Object} content of the message in JSON format,
 		will be converted to XML format
 * @return {Object} built message, ready to be converted to XML
 */
WechatMessage.prototype.makeResponseMessage = function(type, content) {
	var msg = {};
	msg.FromUserName = this.ToUserName;
	msg.ToUserName = this.FromUserName;
	msg.MsgType = type;
	msg.CreateTime = (new Date).getTime().toString();

	if (type === TEXTTYPE) {
		msg.Content = content.content;
	} else if (type === NEWSTYPE) {
		msg.ArticleCount = content.length;
		msg.Articles = [];
		for (var i = 0; i < msg.ArticleCount; ++i) {
			msg.Articles[i] = {}
			for (var index in content[i])
				msg.Articles[i][XMLNames[index]] = content[i][index];
		}
	} else {  // image, voice, video, music
		var newType = type.charAt(0).toUpperCase() + type.slice(1); // capitalize
		msg[newType] = {}
		for (var index in content)
			msg[newType][XMLNames[index]] = content[index];
	}

	return msg;
};

/**
 * Convert an XML message (this) to a JSON message ready to send to touser.
 *
 * @param touser {String} the open id of the recipient
 * @return {Object} built message, ready to be converted to JSON string
 */
WechatMessage.prototype.msg2KeFuMsg = function(touser) {
	var msg = {};
	msg.touser = touser;
	msg.msgtype = this.MsgType;

	if(this.isText()) {
		msg.text = {content: this.Content}
	} else if (this.isImage()) {
		msg.image = {media_id: this.MediaId}
	} else if (this.isVoice()) {
		msg.voice = {media_id: this.MediaId}
	} else if (this.isVideo()) {
		msg.video = {
			media_id: this.MediaId,
			title: "",
			description: ""
		}
	} else { // this.isLocation() || this.isLink()
		// Send a warning back to the sender
		msg.touser = this.FromUserName;
		msg.msgtype = "text";
		msg.text = {content: "抱歉，该消息无法转发！"}
	}

	return msg;
}

/************************* Message bulider & sender ***********************
 ************************ prepared for ousiders to use*********************/

/**
 * KeFu message builder & sender
 *
 * @param token{String} access token of the app
 * @param type {String} type of message
 * @param content {Object} content of the message in JSON format,
 		should conform to the docs
 * @param touser {String} openid of the recipient
 * @param cb {Function} callback
 */
WechatMessage.prototype.sendKeFuMessage = function(token, type, content, touser, callback) {
	var msg = this.makeKeFuMessage(type, content, touser);
	var _db = this.db;
	var _this = this;

	async.waterfall([
		function(cb) {
			if (_db) {
				_db.get('ACCESSTOKEN', function(err, val) {
					val?cb(null, val):cb('no value');
				});
			}else {
				cb(null, token);
			}
		}, function(token, cb) {
			request.post({
				uri: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + token,
				json: msg
			}, function(e, response, body) {
				if (e || !body || body.errcode!==0) {
          if (e) console.log('err: ' + JSON.stringify(e));
          if (body) console.log('errcode: ' + body.errcode);
          return cb('发送客服信息不成功');
        }
				return cb(null, body);
			});
		}], function(err, result) {
			if (err) return _this.sendKeFuMessage(token, type, content, touser, callback); //retry until success
			return (callback && callback(result));
		});
}

/**
 * response message builder & sender
 *
 * @param req {Object} request to respond
 * @param res {Object} response objects
 * @param type {String} type of message
 * @param content {Object} content of the message in JSON format,
 	should conform to the docs
 */
WechatMessage.prototype.sendResponseMessage = function(req, res, type, content) {
	var result = new Js2Xml('xml', this.makeResponseMessage(type, content));
	res.send(result.toString());
	return;
}

/**
 * Forward a message (this) to touser, if the message type is not supported,
 * send back a warning to the sender.
 * @param token{String} access token of the app
 * @param touser {String} openid of the recipient
 * @param cb {Function} callback
 */
WechatMessage.prototype.forwardMessage = function(token, touser, cb) {
	var msg = this.msg2KeFuMsg(touser);
	requestify.post(
		'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + token,
		msg
	).then(function(response) {
		console.log('Posted forwarded message: %j', msg);
	    console.log('Response:' + response.body);
	    if (cb)
	    	cb(response);
	});
	return;
}

/************************* Helper functions *******************************/
/**
 * get the nickname of the user
 *
 * @param token{String} access token of the app
 * @param openid {String} open id of the user to identify
 * @param cb {Function} callback
 */
WechatMessage.prototype.getNickname = function(token, openid, cb) {
	requestify.get(
		"https://api.weixin.qq.com/cgi-bin/user/info?access_token=" + token + "&openid=" + openid + "&lang=zh_CN")
		.then(function(response) {
			cb(response.getBody().nickname);
		});
		return;
};


module.exports = WechatMessage;

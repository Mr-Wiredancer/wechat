WechatMessage = require('../index.js').WechatMessage
parseString = require('xml2js').parseString

describe '传入数据库存储格式的content，检查返回的json字符串', ()->
	msg = {}

	beforeEach (done)->
		parseString tplMsgs.txtMsg, (err, result)->
			expect(err).to.not.exist
			msg = new WechatMessage(result.xml)
			done()

	it "should 正确返回文本", (done)->
		response = msg.makeKeFuMessage('text', tplMsgs.txtContent, msg.FromUserName)
		sample =
			"touser":"fromUser"
			"msgtype":"text"
			"text":
				"content":"Hello World"
		expect(response).to.deep.equal(sample)
		done()

	it "should 正确返回图片", (done)->
		response = msg.makeKeFuMessage('image', tplMsgs.imgContent, msg.FromUserName)
		sample =
			"touser":"fromUser"
			"msgtype":"image"
			"image":
				"media_id":"MEDIA_ID"
		expect(response).to.deep.equal(sample)
		done()

	it "should 正确返回语音", (done)->
		response = msg.makeKeFuMessage('voice', tplMsgs.voiceContent, msg.FromUserName)
		sample =
			"touser":"fromUser"
			"msgtype":"voice"
			"voice":
				"media_id":"MEDIA_ID"
		expect(response).to.deep.equal(sample)
		done()

	it "should 正确返回视频", (done)->
		response = msg.makeKeFuMessage('video', tplMsgs.videoContent, msg.FromUserName)
		sample =
			"touser":"fromUser"
			"msgtype":"video"
			"video":
				"media_id":"MEDIA_ID"
				"title":"TITLE"
				"description":"DESCRIPTION"
		expect(response).to.deep.equal(sample)
		done()

	it "should 正确返回音乐", (done)->
		response = msg.makeKeFuMessage('music', tplMsgs.musicContent, msg.FromUserName)
		sample =
			"touser":"fromUser"
			"msgtype":"music"
			"music":
				"title":"MUSIC_TITLE"
				"description":"MUSIC_DESCRIPTION"
				"musicurl":"MUSIC_URL"
				"hqmusicurl":"HQ_MUSIC_URL"
				"thumb_media_id":"THUMB_MEDIA_ID"
		expect(response).to.deep.equal(sample)
		done()

	it "should 正确返回图文消息", (done)->
		response = msg.makeKeFuMessage('news', tplMsgs.newsContent, msg.FromUserName)
		sample = 
			"touser":"fromUser"
			"msgtype":"news"
			"news":
				"articles": [
					"title":"Happy Day1"
					"description":"Is Really A Happy Day"
					"url":"URL"
					"picurl":"PIC_URL"
				,
					"title":"Happy Day2"
					"description":"Is Really A Happy Day"
					"url":"URL"
					"picurl":"PIC_URL"
				]
		expect(response).to.deep.equal(sample)
		done()
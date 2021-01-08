class Downloader {
	constructor() {
		this.type = "";
		this.id = "";
		this.url = "";
		this.aid = -1;
		this.pid = 1;
		this.cid = -1;
		this.name = "";
		this.links = [];
		this.downloading = [];
	}

	getVideoUrl(videoUrl) {
		this.url = "";
		const mapping = {
			"BV": "https://www.bilibili.com/video/",
			"bv": "https://www.bilibili.com/video/",
			"av": "https://www.bilibili.com/video/",
			"ep": "https://www.bilibili.com/bangumi/play/",
			"ss": "https://www.bilibili.com/bangumi/play/"
		};
		for (let [key, value] of Object.entries(mapping)) {
			if (videoUrl.includes(key)) {
				this.type = key;
				this.id = key + videoUrl.split(key)[1];
				this.url = value + this.id;
				break;
			}
		}
		if (!this.url) {
			console.log("invalid url！");
		}
	}

	getAid() {
		this.getVideoUrl();
		let { type, url } = this;
		if (!url) return;
		fetch(url)
			.then(response => response.text())
			.then(result => {
				let data = result.match(/__INITIAL_STATE__=(.*?);\(function\(\)/)[1];
				data = JSON.parse(data);
				console.log("INITIAL STATE", data);
				if (type === "BV" || type === "bv" || type === "av") {
					this.aid = data.videoData.aid;
					this.pid = parseInt(url.split("p=")[1], 10) || 1;
					this.cid = data.videoData.pages[this.pid - 1].cid;
				}
				else if (type === "ep") {
					this.aid = data.epInfo.aid;
					this.cid = data.epInfo.cid;
				}
				else if (type === "ss") {
					this.aid = data.epList[0].aid;
					this.cid = data.epList[0].cid;
				}
				this.getInfo();
			})
			.catch(error => console.log("Error getting aid！"));
	}

	getInfo() {
		let { id, aid, cid } = this;
		if (!cid) {
			console.error("获取视频 cid 出错！");
			return;
		}
		this.getData();
		
	}

	getData(fallback) {
		let { cid, type } = this, playUrl;
		if (fallback) {
			let params = `cid=${cid}&module=movie&player=1&quality=112&ts=1`,
				sign = crypto.createHash("md5").update(params + "9b288147e5474dd2aa67085f716c560d").digest("hex");
			playUrl = `https://bangumi.bilibili.com/player/web_api/playurl?${params}&sign=${sign}`;
		} else {
			if (type === "BV" || type === "bv" || type === "av") {
				let params = `appkey=iVGUTjsxvpLeuDCf&cid=${cid}&otype=json&qn=112&quality=112&type=`,
					sign = crypto.createHash("md5").update(params + "aHRmhWMLkdeMuILqORnYZocwMBpMEOdt").digest("hex");
				playUrl = `https://interface.bilibili.com/v2/playurl?${params}&sign=${sign}`;
			} else {
				playUrl = `https://api.bilibili.com/pgc/player/web/playurl?qn=80&cid=${cid}`;
			}
		}
		fetch(playUrl)
			.then(response => response.text())
			.then(result => {
				var events = require('events');
				var eventEmitter = new events.EventEmitter();
				let data = fallback ? $(result) : JSON.parse(result),
					target = fallback ? data.find("durl") : (data.durl || data.result.durl);
				console.log("PLAY URL", data);
				if (target) {
					fallback ? this.parseDataFallback(target) : this.parseData(target);
					eventEmitter.emit("ready");
					console.debug(fallback+","+ready+","+target);
				} else {
					if (fallback) {
						throw Error();
					}
					console.debug(fallback+",fallback now");
					this.getData(true);
				}
			})
			.catch(error => {
				console.error("获取 PlayUrl 或下载链接出错！由于B站限制，只能下载低清晰度视频。");
			});
	}

	parseDataFallback(target) {
		this.links = [];
		target.each((i, o) => {
			let part = $(o);
			this.links.push(part.find("url").text());
		});
	}

	parseData(target) {
		this.links = [];
		for (let part of target) {
			this.links.push(part.url);
		}
	}

	downloadAll(video ) {
		let { cid } = this, flag = true;
		let partNum = 0;
		this.links.forEach( (partUrl) => {
			// ipcRenderer.send("length", this.downloading.filter(item => item !== "").length);  ???
			flag = false;
			this.downloadLink(partNum, partUrl);
			partNum++;
		});
		if (flag) console.error("没有新的视频被下载！");
	}

	downloadLink(partNum,part) {
		let { name, cid, url } = this;
		let downloadPath = createTmpDir(),
			file = path.join(downloadPath, `${partNum}.flv`);
		fs.stat(file, (error, state) => {
			let options = {
				url: this.links[part],
				headers: {
					"Range": `bytes=${state ? state.size : 0}-`, //断点续传
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36",
					"Referer": url
				}
			};
			let downloads = fs.createWriteStream(file, state ? { "flags": "a" } : {});
			this.download(partNum, options, downloads);
			console.debug(`从 ${Math.round(state.size / 1e6)}MB 处恢复的下载`);
			//state && $(".addon").eq(index).html(`从 ${Math.round(state.size / 1e6)}MB 处恢复的下载`);
			//console.log(this.cid, file, options.url);
		});
	}

	download(index, options, downloads) {
		// https://blog.csdn.net/zhu_06/article/details/79772229
		let proStream = progress({
			time: 250 //单位ms
		});
		//先pipe到proStream再pipe到文件的写入流中
		(options.url.startsWith("https") ? https : http).get(options.url, options, res => {
			proStream.setLength(res.headers["content-length"]);
			res.pipe(proStream).pipe(downloads).on("error", error => {
				console.error(error);
			});
		});
	}
}
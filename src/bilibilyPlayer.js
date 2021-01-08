

class BilibiliPlayer {
    constructor() {
        this.part = 0;
    }


    play(connection, url) {
        this.part = 0;
        this.downloader = new Downloader();
        this.downloader.getAid().on("ready", () => {
            console.debug("get aid ready");
            playLinkList(connection, this.downloader);
        });        

    }

    playLinkList(downloader,connection) {
        var dispacher = connection.play(downloader.links[this.part])
            .on("error", (error) => console.error(error))
            .on("speaking", (speaking) => {
                debug.console("play stop:"+speaking);
                if (!speaking) {
                    this.part++;
                    if (this.part < downloader.links.length)
                        playLinkList(downloader, connection);
                    else this.part = 0;
                }
            });
    }
}
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const makeDir = require('make-dir');
const readline = require("readline");
const { exit } = require('process');
const _cliProgress = require('cli-progress');
const request = require('request');

//const url = 'https://downloads.khinsider.com/game-soundtracks/album/professor-layton-and-the-curious-village'
module.exports = function () {
    let destinationFolder = 'downloads\\';
    let url = "";

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Insert a link ", function (value) {
        url = value;
        rl.close();
    });

    rl.on("close", function () {
        getData()
    });

    async function getData() {

        await axios(url)
            .then(async response => {
                const html = response.data;
                const $ = cheerio.load(html);
                const album_name = $('#EchoTopic > h2').first()
                const song_list = $('#songlist > tbody > tr');

                console.log(album_name.text())
                destinationFolder = destinationFolder + album_name.text()
                await (async () => {
                    let path = await makeDir(destinationFolder);
                    destinationFolder = path
                    console.log(destinationFolder)

                })();

                console.log('Saving songs in ' + destinationFolder)
                console.log("Getting songs...")
                if (song_list.length == 0) {
                    console.log("I couldn't find any songs...")
                    exit()
                }
                await asyncForEach(song_list, async function (value) {
                    let song_title = $(value).children('.clickable-row').eq(0).text();
                    let song_url_part1 = "https://downloads.khinsider.com";
                    let song_url_part2 = $(value).children('.clickable-row').eq(0).children('a').attr('href');
                    let song_url = song_url_part1 + song_url_part2
                    if (song_url_part2 != null) {
                        await axios(song_url)
                            .then(async response => {
                                let progressBar = new _cliProgress.SingleBar({
                                    format: '{bar} {percentage}% | ETA: {eta}s'
                                }, _cliProgress.Presets.shades_classic);
                                let receivedBytes = 0
                                let html2 = response.data;
                                let $2 = cheerio.load(html2);
                                let mp3_link = $2("#EchoTopic > p:nth-child(9) > a").attr('href');

                                if (!fs.existsSync(destinationFolder + "\\" + song_title + ".mp3")) {
                                    console.log("Downloading " + song_title)
                                    let file = fs.createWriteStream(destinationFolder + "\\" + song_title + ".mp3");
                                    //console.log(mp3_link)
                                    /*
                                        https.get(mp3_link, async function(response) {
                                        response.pipe(file);
                                    });
                                    */
                                    let request_call = new Promise((resolve, reject) => {
                                        request.get(mp3_link)
                                            .on('response', (response) => {
                                                if (response.statusCode !== 200) {
                                                    return callback('Response status was ' + response.statusCode);
                                                }

                                                const totalBytes = response.headers['content-length'];
                                                progressBar.start(totalBytes, 0);
                                            })
                                            .on('data', (chunk) => {
                                                receivedBytes += chunk.length;
                                                progressBar.update(receivedBytes);
                                            })
                                            .pipe(file)
                                            .on('error', (err) => {
                                                fs.unlink(filename);
                                                progressBar.stop();
                                                return callback(err.message);
                                            });

                                        file.on('finish', () => {
                                            progressBar.stop();
                                            file.close();
                                            resolve()
                                        });

                                        file.on('error', (err) => {
                                            fs.unlink(filename);
                                            progressBar.stop();
                                            return callback(err.message);
                                        });
                                    });
                                    let response_body = await request_call
                                } else {
                                    console.log("Song : " + song_title + " was already downloaded")
                                }


                            })
                            .catch(error => {
                                console.log(error)
                            })

                    } else {

                    }
                });

                console.log("Done")
            })
            .catch(error => {
                console.log(error)
            });

    }


    async function asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
}
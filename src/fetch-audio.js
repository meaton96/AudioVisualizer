export const fetchAudio = (videoID) => {


    fetch('https://quiet-island-56330-899af1836277.herokuapp.com/' + "https://www.youtube.com/get_video_info?video_id=" + videoID).then(response => {
        if (response.ok) {
            response.text().then(ytData => {

                // parse response to find audio info
                var ytData = parse_str(ytData);
                var getAdaptiveFormats = JSON.parse(ytData.player_response).streamingData.adaptiveFormats;
                var findAudioInfo = getAdaptiveFormats.findIndex(obj => obj.audioQuality);

                // get the URL for the audio file
                var audioURL = getAdaptiveFormats[findAudioInfo].url;

                // update the <audio> element src
                var youtubeAudio = document.getElementById('youtube');
                youtubeAudio.src = audioURL;

            });
        }
    });

    function parse_str(str) {
        return str.split('&').reduce(function (params, param) {
            var paramSplit = param.split('=').map(function (value) {
                return decodeURIComponent(value.replace('+', ' '));
            });
            params[paramSplit[0]] = paramSplit[1];
            return params;
        }, {});
    }
}
/**
 * Send To Encode This — After Effects ExtendScript
 *
 * Enable: Preferences → Scripting & Expressions →
 * Allow Scripts to Write Files and Access Network
 */
(function sendToEncodeThis() {
  var INTAKE_PORT = 47821;
  var PRESET_ID = 'h264-match-source-high-bitrate';

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function jobJson(mediaPath) {
    return (
      '{"paths":["' +
      esc(mediaPath) +
      '"],"presetId":"' +
      PRESET_ID +
      '","start":true}'
    );
  }

  function ensureFolder(fsPath) {
    var f = new Folder(fsPath);
    if (!f.exists) f.create();
    return f;
  }

  function writeInbox(mediaPath) {
    var candidates = [];
    if ($.os.indexOf('Windows') !== -1) {
      var appData = $.getenv('APPDATA');
      var local = $.getenv('LOCALAPPDATA');
      if (appData) candidates.push(appData + '\\encode-this\\inbox');
      if (local) candidates.push(local + '\\encode-this\\inbox');
    } else {
      candidates.push(Folder('~/Library/Application Support/encode-this/inbox').fsName);
    }

    var payload = jobJson(mediaPath);
    var written = false;
    for (var i = 0; i < candidates.length; i++) {
      try {
        ensureFolder(candidates[i]);
        var out = new File(candidates[i] + '/ae-job-' + new Date().getTime() + '.json');
        out.encoding = 'UTF-8';
        if (out.open('w')) {
          out.write(payload);
          out.close();
          written = true;
        }
      } catch (e) {}
    }
    return written;
  }

  function postHttp(mediaPath) {
    var body = jobJson(mediaPath);
    var cmd;
    if ($.os.indexOf('Windows') !== -1) {
      var tmp = Folder.temp.fsName + '\\encode-this-ae.json';
      var tf = new File(tmp);
      tf.encoding = 'UTF-8';
      tf.open('w');
      tf.write(body);
      tf.close();
      cmd =
        'cmd.exe /c curl.exe -s -X POST http://127.0.0.1:' +
        INTAKE_PORT +
        '/queue/add -H "Content-Type: application/json" --data-binary "@' +
        tmp +
        '"';
    } else {
      cmd =
        'curl -s -X POST http://127.0.0.1:' +
        INTAKE_PORT +
        "/queue/add -H 'Content-Type: application/json' -d '" +
        body +
        "'";
    }
    try {
      system.callSystem(cmd);
      return true;
    } catch (e) {
      return false;
    }
  }

  var media = File.openDialog(
    'Select rendered media to send to Encode This',
    '*.mp4;*.mov;*.mxf;*.mkv;*.avi;*.wav;*.mp3'
  );
  if (!media) return;

  var mediaPath = media.fsName;
  var httpOk = postHttp(mediaPath);
  var inboxOk = writeInbox(mediaPath);

  if (httpOk || inboxOk) {
    alert(
      'Sent to Encode This:\n' +
        mediaPath +
        '\n\nHTTP: ' +
        (httpOk ? 'ok' : 'skipped/failed') +
        '\nInbox: ' +
        (inboxOk ? 'ok' : 'skipped/failed') +
        '\n\nKeep Encode This running with Host intake enabled.'
    );
  } else {
    alert(
      'Could not reach Encode This.\nIs the app running with intake on port ' +
        INTAKE_PORT +
        '?'
    );
  }
})();

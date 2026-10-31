/**
 * Send To EncodeIt — Premiere Pro ExtendScript
 *
 * Enable: Preferences → Scripting & Expressions →
 * Allow Scripts to Write Files and Access Network
 */
(function SendToEncodeItPremiere() {
  var INTAKE_PORT = 47821;
  var PRESET_ID = 'h264-match-source-high-bitrate';

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function jobJson(mediaPath, presetId) {
    return (
      '{"paths":["' +
      esc(mediaPath) +
      '"],"presetId":"' +
      esc(presetId || PRESET_ID) +
      '","start":true}'
    );
  }

  function ensureFolder(fsPath) {
    var f = new Folder(fsPath);
    if (!f.exists) f.create();
    return f;
  }

  function writeInbox(mediaPath, presetId) {
    // Electron userData uses productName "EncodeIt" (spaces) on Win + macOS.
    var candidates = [];
    if ($.os.indexOf('Windows') !== -1) {
      var appData = $.getenv('APPDATA');
      var local = $.getenv('LOCALAPPDATA');
      if (appData) {
        candidates.push(appData + '\\EncodeIt\\inbox');
        candidates.push(appData + '\\encodeit\\inbox');
      }
      if (local) {
        candidates.push(local + '\\EncodeIt\\inbox');
        candidates.push(local + '\\encodeit\\inbox');
      }
    } else {
      candidates.push(Folder('~/Library/Application Support/EncodeIt/inbox').fsName);
      candidates.push(Folder('~/Library/Application Support/encodeit/inbox').fsName);
    }

    var payload = jobJson(mediaPath, presetId);
    var written = false;
    for (var i = 0; i < candidates.length; i++) {
      try {
        ensureFolder(candidates[i]);
        var out = new File(candidates[i] + '/pr-job-' + new Date().getTime() + '.json');
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

  function postHttp(mediaPath, presetId) {
    var body = jobJson(mediaPath, presetId);
    var cmd;
    if ($.os.indexOf('Windows') !== -1) {
      var tmp = Folder.temp.fsName + '\\encodeit-pr.json';
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

  var seqHint = '';
  try {
    if (app.project && app.project.activeSequence) {
      seqHint = app.project.activeSequence.name;
    }
  } catch (e) {}

  var media = File.openDialog(
    seqHint
      ? 'Select exported media for sequence “' + seqHint + '”'
      : 'Select exported media to send to EncodeIt',
    '*.mp4;*.mov;*.mxf;*.mkv;*.avi;*.wav;*.mp3'
  );
  if (!media) return;

  var preset = PRESET_ID;
  var presetInput = prompt(
    'EncodeIt preset id (leave default or paste from Preferences → Integrations):',
    PRESET_ID
  );
  if (presetInput !== null && String(presetInput).replace(/^\s+|\s+$/g, '')) {
    preset = String(presetInput).replace(/^\s+|\s+$/g, '');
  }

  var mediaPath = media.fsName;
  var httpOk = postHttp(mediaPath, preset);
  var inboxOk = writeInbox(mediaPath, preset);

  if (httpOk || inboxOk) {
    alert(
      'Sent to EncodeIt:\n' +
        mediaPath +
        '\nPreset: ' +
        preset +
        '\n\nHTTP: ' +
        (httpOk ? 'ok' : 'skipped/failed') +
        '\nInbox: ' +
        (inboxOk ? 'ok' : 'skipped/failed') +
        '\n\nKeep EncodeIt running with Host intake enabled.'
    );
  } else {
    alert(
      'Could not reach EncodeIt.\nIs the app running with intake on port ' +
        INTAKE_PORT +
        '?'
    );
  }
})();

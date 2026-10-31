/* global CSInterface */
(function () {
  var statusEl = document.getElementById('status')
  var presetEl = document.getElementById('preset')
  var portEl = document.getElementById('port')

  function setStatus(msg, kind) {
    statusEl.textContent = msg
    statusEl.className = kind || ''
  }

  function baseUrl() {
    var port = portEl.value.trim() || '47821'
    return 'http://127.0.0.1:' + port
  }

  async function loadPresets() {
    try {
      var res = await fetch(baseUrl() + '/presets')
      if (!res.ok) throw new Error(res.statusText)
      var presets = await res.json()
      var previous = presetEl.value
      presetEl.innerHTML = ''
      presets.forEach(function (p) {
        var opt = document.createElement('option')
        opt.value = p.id
        opt.textContent = p.group + ' / ' + p.name
        presetEl.appendChild(opt)
      })
      if (previous) presetEl.value = previous
      if (!presetEl.value && presets[0]) presetEl.value = presets[0].id
      setStatus('Loaded ' + presets.length + ' presets from EncodeIt.', 'ok')
    } catch (err) {
      presetEl.innerHTML = ''
      var fallback = document.createElement('option')
      fallback.value = 'h264-match-source-high-bitrate'
      fallback.textContent = 'h264-match-source-high-bitrate (offline)'
      presetEl.appendChild(fallback)
      setStatus(
        'Could not load presets: ' +
          (err && err.message ? err.message : String(err)) +
          '\nIs EncodeIt running with host intake enabled?',
        'err'
      )
    }
  }

  async function send() {
    var preset = presetEl.value.trim()
    var mediaPath = document.getElementById('path').value.trim()
    if (!mediaPath) {
      setStatus('Choose a media path first.', 'err')
      return
    }

    var body = JSON.stringify({
      paths: [mediaPath],
      presetId: preset,
      start: true
    })

    try {
      var res = await fetch(baseUrl() + '/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
      var json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      setStatus('Queued ' + json.added + ' item(s).', 'ok')
    } catch (err) {
      setStatus(
        'Failed: ' +
          (err && err.message ? err.message : String(err)) +
          '\nIs EncodeIt running with host intake enabled?',
        'err'
      )
    }
  }

  document.getElementById('send').addEventListener('click', function () {
    void send()
  })
  document.getElementById('refresh').addEventListener('click', function () {
    void loadPresets()
  })
  portEl.addEventListener('change', function () {
    void loadPresets()
  })

  void fetch(baseUrl() + '/health')
    .then(function (r) {
      return r.json()
    })
    .then(function (j) {
      setStatus('EncodeIt online: ' + j.address, 'ok')
      return loadPresets()
    })
    .catch(function () {
      setStatus('EncodeIt intake not detected on :' + (portEl.value || '47821'), 'err')
      void loadPresets()
    })
})()

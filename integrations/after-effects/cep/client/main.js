/* global CSInterface */
(function () {
  var statusEl = document.getElementById('status')

  function setStatus(msg) {
    statusEl.textContent = msg
  }

  async function send() {
    var port = document.getElementById('port').value.trim() || '47821'
    var preset = document.getElementById('preset').value.trim()
    var mediaPath = document.getElementById('path').value.trim()
    if (!mediaPath) {
      setStatus('Choose a media path first.')
      return
    }

    var body = JSON.stringify({
      paths: [mediaPath],
      presetId: preset,
      start: true
    })

    try {
      var res = await fetch('http://127.0.0.1:' + port + '/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
      var json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      setStatus('Queued ' + json.added + ' item(s).')
    } catch (err) {
      setStatus(
        'Failed: ' +
          (err && err.message ? err.message : String(err)) +
          '\nIs Encode This running with host intake enabled?'
      )
    }
  }

  document.getElementById('send').addEventListener('click', function () {
    void send()
  })

  // Optional: probe health on load
  void fetch('http://127.0.0.1:47821/health')
    .then(function (r) {
      return r.json()
    })
    .then(function (j) {
      setStatus('Encode This online: ' + j.address)
    })
    .catch(function () {
      setStatus('Encode This intake not detected on :47821')
    })
})()

(function () {
  // Pause the hero animation for people who prefer reduced motion,
  // on a frame where the forklift is next to the wreck.
  var svg = document.getElementById('wreck-loop');
  if (svg && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try { svg.setCurrentTime(3); svg.pauseAnimations(); } catch (e) {}
  }

  var labels = {
    'beta-form': { idle: 'Join the beta', busy: 'Joining…' },
    'feedback-form': { idle: 'Send feedback', busy: 'Sending…' }
  };

  function setStatus(form, state, text) {
    var el = form.querySelector('.status');
    el.dataset.state = state;
    el.textContent = text;
  }

  function handle(form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var label = labels[form.id] || { idle: button.textContent, busy: 'Sending…' };

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus(form, 'error', 'Fill in the required fields and tick the box to continue.');
        return;
      }

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      data.consent = form.elements.consent.checked;

      button.disabled = true;
      button.textContent = label.busy;
      setStatus(form, '', '');

      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: res.ok, body: body };
          });
        })
        .then(function (result) {
          if (result.ok) {
            form.reset();
            setStatus(form, 'ok', result.body.message || 'Sent. Thank you.');
          } else {
            setStatus(form, 'error', result.body.error || 'Something went wrong. Try again in a minute.');
          }
        })
        .catch(function () {
          setStatus(form, 'error', 'Could not reach the server. Check your connection and try again.');
        })
        .then(function () {
          button.disabled = false;
          button.textContent = label.idle;
        });
    });
  }

  document.querySelectorAll('form[data-endpoint]').forEach(handle);
})();

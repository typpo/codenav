chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      run();
    }
  }, 10);
});

function run() {
  var token_index = {};

  console.log('Running modifications');
  var $ = window.jQuery;

  $('.code-body').addClass('codenav_word_split');
  $('.code-body span').each(function() {
    var $this = $(this);
    var tok = $this.html();
    if (!token_index[tok]) {
      token_index[tok] = [];
    }
    var token_list = token_index[tok];
    token_list.push($this);
  });

  // omit comments and such
  $('.code-body .c').addClass('codenav_word_split_off');

  // Click behavior
  $('.code-body span').on('click', function() {
    $('.code-body .codenav_selected_sticky').removeClass('codenav_selected_sticky');
    var tokens = token_index[$(this).html()];
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_selected_sticky');
    }
  });

  // Hover behavior
  $('.code-body span').hover(function() {
    var tokens = token_index[$(this).html()];
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_selected');
    }
  }, function() {
    $('.code-body .codenav_selected').removeClass('codenav_selected');
  });
}

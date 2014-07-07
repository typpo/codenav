chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      run();
    }
  }, 10);
});

var cfg = {};

function run() {
  console.log('Running modifications');

  setup_config();
  setup_code_highlighting();
  setup_search();
}

function setup_config() {
  // eg. /typpo/asterank
  cfg.repo_home_link = $('.js-repo-home-link').attr('href');
}

function setup_code_highlighting() {
  var $ = window.jQuery;
  var token_index = {};

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
    $('.code-body .codenav_highlight_sticky').removeClass('codenav_highlight_sticky');
    var tokens = token_index[$(this).html()];
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_highlight_sticky');
    }
  });

  // Hover behavior
  $('.code-body span').hover(function() {
    var tokens = token_index[$(this).html()];
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_highlight');
    }
  }, function() {
    $('.code-body .codenav_highlight').removeClass('codenav_highlight');
  });
}

function setup_search() {
  $('.code-body span').on('click', function() {
    var query = $(this).text();
    var url = 'https://github.com' + cfg.repo_home_link + '/search?q=' + query;

    var $div = $('<div class="codenav_search_results"><h1>Loading...</h1></div>').appendTo('body');

    $.get(url, function(data) {
      var $data = $(data);
      var $results = $data.find('#code_search_results');

      $results.find('.code-list-item').on('hover', function() {

      }, function() {

      });

      $results.find('.code-list-item').on('click', function() {

      });

      $div.empty().append($results);
    });
  });
}

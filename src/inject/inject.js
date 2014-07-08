chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      run();
    }
  }, 10);
});

var $ = window.jQuery;
var cfg = {};

function run() {
  console.log('Running modifications');

  setup_config();
  setup_code_highlighting();
  setup_scroll_wrapper();
  setup_search();
}

function setup_config() {
  // eg. /typpo/asterank
  cfg.repo_home_link = $('.js-repo-home-link').attr('href');
  cfg.original_scroll_pos = $(window).scrollTop();
}

function setup_code_highlighting() {
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

function setup_scroll_wrapper() {
  var $bwrapper = $('.blob-wrapper');
  $bwrapper.addClass('codenav_blob_wrapper').height(
      $(window).height() - $bwrapper.offset().top)

  $('body').addClass('codenav_hide_scroll');

  // Handle when github scrolls for the user initially, eg.
  // https://github.com/typpo/asterank/blob/ab4655402ca61fccc339caab1a6c0ba7d14abf66/static/js/main/controllers/asteroid_table.js#L90
  // TODO fix this when user uses f5 to refresh
  $bwrapper.scrollTop(cfg.original_scroll_pos - $bwrapper.offset().top);
  $(window).scrollTop(0);
}

function setup_search() {
  $('.code-body span').on('click', function() {
    var query = $(this).text();
    var url = 'https://github.com' + cfg.repo_home_link + '/search?q=' + query;

    var $div = $('<div class="codenav_search_results"><h1>Loading...</h1></div>').appendTo('body');

    $.get(url, function(data) {
      var $data = $(data);
      var $results = $data.find('#code_search_results');

      $div.empty().append($results);

      $div.find('.code-list-item .line').hover(function() {
        $(this).addClass('codenav_search_results_highlight');
      }, function() {
        $('.codenav_search_results_highlight').removeClass('codenav_search_results_highlight');
      });

      $div.find('.code-list-item .line').on('click', function() {
        // This element is the Nth .line
        var lines = $(this).closest('.diff-line-code').find('.line');
        var my_line_index = 0;
        for (; my_line_index < lines.length; my_line_index++) {
          if (lines[my_line_index] == this) {
            break;
          }
        }

        // Guess line num - github doesn't really know
        var $firstline = $($(this).closest('.blob-line-code').find('.blob-line-nums a')[0]);
        var href = $firstline.attr('href');
        var num = parseInt($firstline.text());

        // True line number is offset by 2 inexplicably
        var lineno = num + my_line_index + 2;
        var linehref = href.slice(0, href.indexOf('#'));

        window.location.href = 'https://github.com' + linehref + '#L' + lineno;
      });
    });
  });
}

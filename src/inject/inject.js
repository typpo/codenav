var $ = window.jQuery;
var cfg = {};

chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      run();

      // Convoluted detection for pushstate
      var lastloc = window.location.href;
      setInterval(function() {
        if (lastloc != window.location.href) {
          setTimeout(run, 300);
          lastloc = window.location.href;
        }
      }, 100);
    }
  }, 10);
});

function run() {
  if (!is_code_page()) {
    return;
  }
  setup_config();
  setup_code_highlighting();
  setup_scroll_wrapper();
  setup_search();
}

function is_code_page() {
  return $('#LC1').length > 0;
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
  $('.code-body .c').addClass('codenav_ignore');

  // Click behavior
  $('.code-body span').on('click', function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    $('.code-body .codenav_highlight_sticky').removeClass('codenav_highlight_sticky');
    var tokens = token_index[$this.html()];
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_highlight_sticky');
    }
  });

  // Hover behavior
  $('.code-body span').hover(function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    var tokens = token_index[$this.html()];
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

var $prevdiv = null;
function setup_search() {
  $('.code-body span').on('click', function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    var query = $this.text();
    var url = 'https://github.com' + cfg.repo_home_link + '/search?q=' + query;

    var $div = $(SEARCH_DIV).appendTo('body');
    if ($prevdiv) {
      $prevdiv.remove();
    }
    $prevdiv = $div;
    var $search_content = $div.find('.codenav_search_content');

    $.get(url, function(data) {
      var $data = $(data);
      var $results = $data.find('#code_search_results');
      $results.find('.search-foot-note').remove();

      $search_content.empty().append($results);

      $search_content.find('.code-list-item .line').hover(function() {
        $(this).addClass('codenav_search_results_highlight');
      }, function() {
        $('.codenav_search_results_highlight').removeClass('codenav_search_results_highlight');
      });

      $search_content.find('.code-list-item .line').on('click', function() {
        // This element is the Nth .line
        var lines = $(this).closest('.diff-line-code').find('.line');
        var my_line_index = 0;
        for (; my_line_index < lines.length; my_line_index++) {
          if (lines[my_line_index] == this) {
            break;
          }
        }

        // Guess line num - github doesn't really know here
        // Check out this example where Github just labels stuff wrong
        // https://github.com/typpo/asterank/blob/ab4655402ca61fccc339caab1a6c0ba7d14abf66/static/js/main/controllers/custom_input.js#L33
        var $firstline = $($(this).closest('.blob-line-code').find('.blob-line-nums a')[0]);
        var href = $firstline.attr('href');
        var num = parseInt($firstline.text());
        var linehref = href.slice(0, href.indexOf('#'));

        // True line number is offset by 2 inexplicably
        var offset = 2;
        if (window.location.href.indexOf(linehref) > -1) {
          // unless it's just jumping around in the same file...
          offset = 0;
        }
        var lineno = num + my_line_index + offset;

        window.location.href = 'https://github.com' + linehref + '#L' + lineno;
      });
    });

    $div.find('.codenav_search_x').on('click', function() {
      $div.remove();
    });
  });
}

var SEARCH_DIV =
'<div class="codenav_search_results">' +
    '<div class="codenav_search_x">X</div>' +
    '<div class="codenav_search_content">' +
      '<h1 style="text-align:center">Searching...</h1>' +
    '</div>' +
'</div>'

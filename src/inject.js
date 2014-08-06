var $ = window.jQuery;
var cfg = {};
var fns = {};

$(function() {
  run();

  // Silly detection for pushstate changes
  var lastloc = window.location.pathname;
  setInterval(function() {
    if (lastloc != window.location.pathname) {
      setTimeout(run, 300);
      lastloc = window.location.pathname;
    }
  }, 100);
});

function run() {
  setup_config();
  setup_code_highlighting();
  setup_scroll_wrapper();
  setup_scroll_bar();
  setup_search();
  setup_scroll_bar_positioning();
}

function is_code_page() {
  return $('#LC1').length > 0;
}

function setup_config() {
  // eg. /typpo/asterank
  cfg.repo_home_link = $('.js-repo-home-link').attr('href');
  cfg.original_scroll_pos = $(window).scrollTop();

  var font_size = $('.code-body').css('font-size');
  cfg.line_height = font_size ? Math.floor(parseInt(font_size.replace('px','')) * 1.5) : 19;
}

function setup_code_highlighting() {
  var token_index = {};

  $('.code-body').addClass('codenav_word_split');

  // Build the index on startup
  $('.code-body span').each(function() {
    var $this = $(this);
    var tok = $this.html();
    if (/^[ ,\(\)\.\\\/\[\]\{\}\'\"\:\;\+]+$/.test(tok)) {
      // omit strings of symbols
      return;
    }
    if (!(token_index[tok] instanceof Array)) {
      token_index[tok] = [];
    }
    var token_list = token_index[tok];
    token_list.push($this);
  });

  // omit comments and such
  $('.code-body .c,.c1').addClass('codenav_ignore');

  // Click behavior
  $('.code-body span').on('click', function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    $('.code-body .codenav_highlight_sticky').removeClass('codenav_highlight_sticky');
    var tokens = token_index[$this.html()];
    if (!tokens) {
      // This token wasn't indexed.
      return;
    }
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_highlight_sticky');
    }
  });

  // Hover behavior
  // User must hover for 150 ms to trigger 'hover' event.
  var hover_timer = null;
  $('.code-body span').hover(function() {
    var $this = $(this);
    hover_timer = setTimeout(function() {
      if ($this.hasClass('codenav_ignore')) {
        return;
      }

      // Unhighlight existing
      $('.code-body .codenav_highlight').removeClass('codenav_highlight');

      // Then highlight
      var tokens = token_index[$this.html()];
      if (!tokens) {
        // We didn't index this token
        return;
      }
      fns.codenav_clear_marks();
      for (var i=0; i < tokens.length; i++) {
        var tok = tokens[i];
        tok.addClass('codenav_highlight');
        var lineno = parseInt(tok.closest('.line').attr('id').slice(2));
        fns.codenav_mark_line(lineno, tok);
      }
    }, 150);
  }, function() {
    if (hover_timer) {
      clearTimeout(hover_timer);
    }
  });
}

function scroll_to_lineno(n) {
  var $bwrapper = $('.blob-wrapper');
  var $lineelt = $('#LC' + n);
  var linepos = $lineelt.offset().top;
  var margin = Math.round($lineelt.height() / 3);
  $('html, body').animate({ scrollTop: (linepos - margin)});
}

function setup_scroll_wrapper() {
  if(!is_code_page()) { return; }

  var $bwrapper = $('.blob-wrapper');
  $bwrapper.addClass('codenav_blob_wrapper');

  // Handle when github scrolls for the user initially, eg.
  // https://github.com/typpo/asterank/blob/ab4655402ca61fccc339caab1a6c0ba7d14abf66/static/js/main/controllers/asteroid_table.js#L90
  // TODO fix this when user uses f5 to refresh
  $bwrapper.scrollTop(cfg.original_scroll_pos - $bwrapper.offset().top);
  $(window).scrollTop(0);

  // Handle when user clicks line numbers
  //var scroll_before_hash_change = 0;
  window.onhashchange = function(e) {
    if (window.location.hash.indexOf('#L') === 0) {
      // TODO record scroll location on click and return exactly there.
      scroll_to_lineno(window.location.hash.slice(2));
    }
  }
}

// As we scroll past the top of the file code container, attach the line marker container to be
// fixed in the viewport (& reset it to be contained in the file container if we scroll back up.)
function setup_scroll_bar_positioning() {
  // This function is called on pjax page loads (where the window object persists but the page
  // content changes), so first unregister any old window event handlers before adding new ones
  $(window)
    .off('scroll.codenav')
    .off('resize.codenav');

  if(!is_code_page()) {
    return;
  }

  var $bwrapper = $('.blob-wrapper');
  var $fcode = $('.file-code');
  var $scrollindicator = $('.codenav_scroll_indicator');

  // Cache the current 'position' attribute of $scrollindicator to save a CSS lookup/set each scroll
  var last_position = null;

  // On page scroll, check if the $scrollindicator container holding our line markings should be
  // attached to its parent like a normal element, or fixed in the viewport as we scroll down
  $(window).on('scroll.codenav', function() {
    if(($bwrapper.offset().top - $(document).scrollTop()) <= 0) {
      // If we've scrolled past the top of the code blob container, fix $scrollindicator to viewport
      if(last_position != 'fixed') { // Only update CSS attributes if not already set correctly
        $scrollindicator
          .css('position', 'fixed')
          // We don't need to add padding for the file header bar because it's scrolled offscreen
          // at this point
          .css('top', '0px');

        last_position = 'fixed';
      }
    } else {
      // If we're above the top of the code blob container, attach $scrollindicator to it
      if(last_position != 'absolute') {
        $scrollindicator
          .css('position', 'absolute')
          // We add 45px of padding above it to account for the file header info/actions bar
          .css('top', '45px');

        last_position = 'absolute';
      }
    }
  })

  // We resize the $scrollindicator container to be the visible height of the blob wrapper
  $(window).on('resize.codenav', function() {
    $scrollindicator.height($(window).innerHeight());
  });

  var debounced_scroll_handler = debounce(function() {
    var amount_scrolled_below_top_of_bwrapper  = $(window).scrollTop() - $bwrapper.offset().top;
    var amount_scrolled_below_bottom_of_bwrapper = amount_scrolled_below_top_of_bwrapper +
      $(window).height() - $bwrapper.height();

    if (amount_scrolled_below_bottom_of_bwrapper > 0) {
      $scrollindicator.height($(window).innerHeight() - amount_scrolled_below_bottom_of_bwrapper);
    } else {
      $scrollindicator.height($(window).innerHeight());
    }
  }, 50);
  $(window).on('scroll', function() {
    debounced_scroll_handler();
  });
}

function setup_scroll_bar() {
  // Manual width is to fix firefox problem.
  var $td = $('<td id="codenav_scroll_cell" style="width:1%"></td>').appendTo($('tr.file-code-line'));
  var $scrollindicator = $('<div class="codenav_scroll_indicator"></div>').appendTo($td);
  var $fcode = $('.file-code');
  var $bwrapper = $('.blob-wrapper');

  var total_num_lines = $('.line').length; // total lines in file

  var did_set_border = false;

  // Define marking functions.
  fns.codenav_mark_line = function(n, $elt) {
    // Reset height to handle resize
    var $bwrapper = $('.blob-wrapper');
    $scrollindicator.height(Math.min($(window).innerHeight(), $bwrapper.height()));

    if(!did_set_border) {
      $bwrapper.css("border-right", "14px solid rgba(0, 0, 0, 0.04)");
      did_set_border = true;
    }

    // Compute marker position
    var height;
    if ($('body').height() > $(window).height()) {
      // Has scroll bar.
      height = Math.round((n/total_num_lines) * 100) + '%';
    } else {
      // Handle the special case where the document fits within the entire window.
      height = (cfg.line_height * n - 20) + 'px';
    }

    var $mark = $('<span class="codenav_scroll_indicator_mark"></span>')
        .appendTo($scrollindicator)
        .css('top', height)
        // Fix positioning if code is horizontally scrollable
        .css('margin-left', -1*Math.max(0, $fcode.width() - 920 + 11))
        .on('click', function() {
          // Note this doesn't handle resize between setup and click.
          scroll_to_lineno(n);
          // remove green sticky things; the user has clicked on something new.
          $('.codenav_highlight_sticky').removeClass('codenav_highlight_sticky');
          $elt.addClass('codenav_highlight_sticky');
        });
  }

  fns.codenav_clear_marks = function() {
    $('.codenav_scroll_indicator_mark').remove();
  }
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

    setup_search_dragbar();
    var $search_content = $div.find('#codenav_search_content');

    // Run github search and extract results into codenav div
    $.get(url, function(data) {
      var $data = $(data);
      var $results = $data.find('#code_search_results');
      if ($results.length === 0) {
        $search_content.empty().append('<h1>Nothing found</h1>');
        return;
      }
      $results.find('.search-foot-note').html('<div><br>(Note that Github provides one search result per file)</div>');

      $search_content.empty().append($results);

      $summ = $('#codenav_search_summary');
      var numresults = $search_content.find('.code-list-item').length;
      if (numresults >= 10) {
        // TODO handle github pagination.
        numresults = '10+';
      }
      $summ.html('<h3>Showing ' + numresults + ' results</h3><hr/>');

      $search_content.find('.code-list-item .line').hover(function() {
        $(this).addClass('codenav_search_results_highlight');
      }, function() {
        $('.codenav_search_results_highlight').removeClass('codenav_search_results_highlight');
      });

      $search_content.find('.code-list-item .line').on('click', function() {
        // This element is the Nth .line
        var lines = $(this).closest('.blob-line-code').find('.line');
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

        var offset = 0;
        var lineno = num + my_line_index + offset;
        if (window.location.href.indexOf(linehref) > -1) {
          // Same page. Just scroll to it directly.
          scroll_to_lineno(lineno);
        } else {
          window.location.href = 'https://github.com' + linehref + '#L' + lineno;
        }
        $div.remove();
      });
    });

    $div.find('#codenav_search_x').on('click', function() {
      $div.remove();
    });
  });
}

// TODO remember this preferred height between sessions
var preferred_search_box_height = 300;
function setup_search_dragbar() {
  var $csd = $('#codenav_search_drag');
  var $csr = $('#codenav_search_results');
  var dragging = false;

  // Set default height
  $csr.height(preferred_search_box_height);
  $csd.css('bottom', preferred_search_box_height);

  // Height listeners
  $csd.mousedown(function(e) {
    e.preventDefault();
    dragging = true;

    $(document).mousemove(function(e) {
      $csd.css('top', e.pageY);
    });
  });

  $csd.mouseup(function() {
    if (dragging) {
      var newheight = $(window).height() - parseInt($csd.css('top'));
      preferred_search_box_height = newheight;
      $csr.css('height', newheight);
      $(document).unbind('mousemove');
      dragging = false;
    }
  });
}

var debounce = function (func, threshold, execAsap) {
  var timeout;
  return function debounced () {
    var obj = this, args = arguments;
    function delayed () {
      if (!execAsap)
        func.apply(obj, args);
      timeout = null;
    }
    if (timeout)
      clearTimeout(timeout);
    else if (execAsap)
      func.apply(obj, args);
    timeout = setTimeout(delayed, threshold || interval);
  };
};

var SEARCH_DIV =
'<div id="codenav_search_drag"></div>' +
'<div id="codenav_search_results">' +
    '<div id="codenav_search_x">&times;</div>' +
    '<div id="codenav_search_summary"></div>' +
    '<div id="codenav_search_content">' +
      '<h1>Searching...</h1>' +
    '</div>' +
'</div>'

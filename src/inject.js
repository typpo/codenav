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
  setup_scroll_bar();
  setup_search();
  setup_scroll_bar_positioning();

  setTimeout(function() {
    $(window).trigger('scroll.codenav');
  }, 100);
}

function is_code_page() {
  return $('#LC1').length > 0;
}

function setup_config() {
  // eg. /typpo/asterank
  cfg.repo_home_link = window.location.pathname.split('/').slice(0, 3).join('/');
  cfg.original_scroll_pos = $(window).scrollTop();

  cfg.$code_body = $('.js-file-line-container');

  var font_size = cfg.$code_body.css('font-size');
  cfg.line_height = font_size ? Math.floor(parseInt(font_size.replace('px','')) * 1.5) : 19;
}

function wrap_text_nodes_in_span($container) {
  $container.find('*').contents().filter(function() {
    return this.nodeType == Node.TEXT_NODE;
  }).wrap('<span/>');
}

function get_token_from_elt($elt) {
  var tok = $elt.text();
  if (!tok && $elt.length > 0) {
    // elt is a text node.
    tok = $elt[0].nodeValue;
  }
  var token_regexp = /[a-zA-Z_\-\$]+/g;
  var matches = token_regexp.exec(tok);
  if (matches && matches.length > 0) {
    return matches[0];
  }
  return null;
}

function setup_code_highlighting() {
  var token_index = {};

  cfg.$code_body.addClass('codenav_word_split');

  // Necessary because you can't bind events to text nodes.
  wrap_text_nodes_in_span(cfg.$code_body);

  // Build the index on startup
  cfg.$code_body.find('td').contents().each(function() {
    var $this = $(this);
    var tok = get_token_from_elt($this);
    if (!tok || /^[ ,\(\)\.\\\/\[\]\{\}\'\"\:\;\+]*$/.test(tok)) {
      return;
    }

    if (!(token_index[tok] instanceof Array)) {
      token_index[tok] = [];
    }
    var token_list = token_index[tok];
    token_list.push($this);
  });

  // omit comments and such
  cfg.$code_body.find('.c,.c1').addClass('codenav_ignore');

  // TODO(ian): Bind all events efficiently to container, not individual elements.
  // Click behavior
  cfg.$code_body.find('td').contents().on('click', function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    cfg.$code_body.find('.codenav_highlight_sticky').removeClass('codenav_highlight_sticky');
    var tok_from_elt = get_token_from_elt($this);
    var tokens = token_index[tok_from_elt];
    if (!tokens) {
      // This token wasn't indexed.
      return;
    }
    for (var i=0; i < tokens.length; i++) {
      tokens[i].addClass('codenav_highlight_sticky');
    }
  });

  // Hover behavior
  cfg.$code_body.find('td').contents().hover(function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }

    // Unhighlight existing
    cfg.$code_body.find('.codenav_highlight').removeClass('codenav_highlight');

    // Then highlight
    var tok = get_token_from_elt($this);
    var tokens = token_index[tok];
    if (!tokens) {
      // We didn't index this token
      return;
    }
    fns.codenav_clear_marks();
    for (var i=0; i < tokens.length; i++) {
      var $tok = tokens[i];
      $tok.addClass('codenav_highlight');
      var lineno = parseInt($tok.closest('td').attr('id').slice(2), 10);
      fns.codenav_mark_line(lineno, $tok);
    }
  }, function() {
  });
}

function scroll_to_lineno(n) {
  var $bwrapper = $('.blob-wrapper');
  var $lineelt = $('#LC' + n);
  var linepos = $lineelt.offset().top;
  var margin = Math.round($lineelt.height() / 3);
  $('html, body').animate({ scrollTop: (linepos - margin)});
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
  var $scrollindicator = $('.codenav_scroll_indicator');

  // Cache the current 'position' attribute of $scrollindicator to save a CSS lookup/set each scroll
  var last_position = null;

  // On page scroll, check if the $scrollindicator container holding our line markings should be
  // attached to its parent like a normal element, or fixed in the viewport as we scroll down
  $(window).on('scroll.codenav', function() {
    var amount_scrolled_below_top_of_bwrapper  = $(window).scrollTop() - $bwrapper.offset().top;
    var amount_scrolled_below_bottom_of_bwrapper = amount_scrolled_below_top_of_bwrapper +
      $(window).height() - $bwrapper.height();

    if(amount_scrolled_below_top_of_bwrapper > 0) {
      // If we've scrolled past the top of the code blob container, fix $scrollindicator to viewport
      if (last_position !== 'fixed') { // Only update CSS attributes if not already set correctly
        $scrollindicator
          .css('position', 'fixed')
          // We don't need to add padding for the file header bar because it's scrolled offscreen
          // at this point
          .css('top', '0px')
          .css('left', Math.round($bwrapper.offset().left + $bwrapper.width() - 7) + 'px');

        last_position = 'fixed';
      }
    } else {
      // If we're above the top of the code blob container, attach $scrollindicator to it
      if (last_position !== 'absolute') {
        $scrollindicator
          .css('position', 'absolute')
          // We add 45px of padding above it to account for the file header info/actions bar
          .css('top', '45px')
          .css('left', 'auto');

        last_position = 'absolute';
      }
    }

    if (amount_scrolled_below_bottom_of_bwrapper > 0) {
      $scrollindicator.height($(window).innerHeight() - amount_scrolled_below_bottom_of_bwrapper);
    } else {
      $scrollindicator.height($(window).innerHeight());
    }
  })

  // We resize the $scrollindicator container to be the visible height of the blob wrapper
  $(window).on('resize.codenav', function() {
    $scrollindicator.height($(window).innerHeight());
    $(window).trigger('scroll.codenav');
  });
}

function setup_scroll_bar() {
  // Manual width is to fix firefox problem.
  var $scrollindicator = $('<div class="codenav_scroll_indicator"></div>')
    .appendTo($('.js-file-line-container').parent());
  var $bwrapper = $('.blob-wrapper');

  var total_num_lines = $('.js-line-number').length; // total lines in file

  var did_set_border = false;

  // Define marking functions.
  fns.codenav_mark_line = function(n, $elt) {
    // Reset height to handle resize
    var $bwrapper = $('.blob-wrapper');
    $scrollindicator.height(Math.min($(window).innerHeight(), $bwrapper.height()));

    if(!did_set_border) {
      $bwrapper.css('border-right', '14px solid rgba(0, 0, 0, 0.04)');
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
        //.css('margin-left', -1*Math.max(0, $fcode.width() - 920 + 11))
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
  cfg.$code_body.find('span').on('click', function() {
    var $this = $(this);
    if ($this.hasClass('codenav_ignore')) {
      return;
    }
    var query = $this.text();
    var url = 'https://github.com' + cfg.repo_home_link + '/search?utf8=✓&type=Code&q=' + query;

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

      $search_content.find('.blob-line-code').hover(function() {
        $(this).addClass('codenav_search_results_highlight');
      }, function() {
        $('.codenav_search_results_highlight').removeClass('codenav_search_results_highlight');
      });

      $search_content.find('.blob-line-code').on('click', function() {
        // This element is the Nth .line
        var $lineno = $(this).prev();
        var href = $lineno.find('a').attr('href');
        var lineno = parseInt($lineno.text());
        /*
         * TODO handle case where it's in the same file.
        if (window.location.href.indexOf(linehref) > -1) {
          // Same page. Just scroll to it directly.
          scroll_to_lineno(lineno);
        }
        */
       window.location.href = href;
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

var SEARCH_DIV =
'<div id="codenav_search_drag"></div>' +
'<div id="codenav_search_results">' +
    '<div id="codenav_search_x">&times;</div>' +
    '<div id="codenav_search_summary"></div>' +
    '<div id="codenav_search_content">' +
      '<h1>Searching...</h1>' +
    '</div>' +
'</div>'

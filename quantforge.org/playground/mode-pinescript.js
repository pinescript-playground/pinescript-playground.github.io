/**
 * Pine Script Mode for Ace Editor
 * Provides syntax highlighting for TradingView Pine Script v5
 */

ace.define('ace/mode/pinescript', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/text_highlight_rules'], function (require, exports, module) {
    'use strict';

    var oop = require('../lib/oop');
    var TextMode = require('./text').Mode;
    var TextHighlightRules = require('./text_highlight_rules').TextHighlightRules;

    var PineScriptHighlightRules = function () {
        // Pine Script Keywords
        var keywords =
            'if|else|for|while|switch|break|continue|return|var|varip|true|false|na|and|or|not|import|export|method|type|' +
            'int|float|bool|string|color|array|matrix|map|line|label|box|table|linefill|polyline';

        // Pine Script Built-in Functions and Namespaces
        var builtinFunctions =
            'plot|plotshape|plotchar|plotarrow|plotcandle|plotbar|hline|fill|bgcolor|barcolor|' +
            'line\\.new|line\\.delete|line\\.get_price|line\\.get_x1|line\\.get_x2|line\\.get_y1|line\\.get_y2|line\\.set_color|line\\.set_extend|line\\.set_style|line\\.set_width|line\\.set_x1|line\\.set_x2|line\\.set_y1|line\\.set_y2|line\\.set_xy1|line\\.set_xy2|' +
            'label\\.new|label\\.delete|label\\.get_text|label\\.get_x|label\\.get_y|label\\.set_color|label\\.set_size|label\\.set_style|label\\.set_text|label\\.set_textcolor|label\\.set_tooltip|label\\.set_x|label\\.set_xy|label\\.set_y|label\\.set_yloc|' +
            'box\\.new|box\\.delete|box\\.get_bottom|box\\.get_left|box\\.get_right|box\\.get_top|box\\.set_bgcolor|box\\.set_border_color|box\\.set_border_style|box\\.set_border_width|box\\.set_bottom|box\\.set_extend|box\\.set_left|box\\.set_lefttop|box\\.set_right|box\\.set_rightbottom|box\\.set_top|' +
            'table\\.new|table\\.delete|table\\.cell|table\\.clear|table\\.merge_cells|table\\.set_bgcolor|table\\.set_border_color|table\\.set_border_width|table\\.set_frame_color|table\\.set_frame_width|' +
            'array\\.new|array\\.new_bool|array\\.new_box|array\\.new_color|array\\.new_float|array\\.new_int|array\\.new_label|array\\.new_line|array\\.new_string|array\\.new_table|' +
            'array\\.from|array\\.avg|array\\.binary_search|array\\.binary_search_leftmost|array\\.binary_search_rightmost|array\\.clear|array\\.concat|array\\.copy|array\\.covariance|array\\.every|array\\.fill|array\\.first|array\\.get|array\\.includes|array\\.indexof|array\\.insert|array\\.join|array\\.last|array\\.lastindexof|array\\.max|array\\.median|array\\.min|array\\.mode|array\\.new_bool|array\\.percentile_linear_interpolation|array\\.percentile_nearest_rank|array\\.percentrank|array\\.pop|array\\.push|array\\.range|array\\.remove|array\\.reverse|array\\.set|array\\.shift|array\\.size|array\\.slice|array\\.some|array\\.sort|array\\.sort_indices|array\\.standardize|array\\.stdev|array\\.sum|array\\.unshift|array\\.variance|' +
            'matrix\\.new|matrix\\.add_col|matrix\\.add_row|matrix\\.avg|matrix\\.col|matrix\\.columns|matrix\\.concat|matrix\\.copy|matrix\\.det|matrix\\.diff|matrix\\.eigenvalues|matrix\\.eigenvectors|matrix\\.elements_count|matrix\\.fill|matrix\\.get|matrix\\.inv|matrix\\.is_antisymmetric|matrix\\.is_antidiagonal|matrix\\.is_binary|matrix\\.is_diagonal|matrix\\.is_identity|matrix\\.is_square|matrix\\.is_stochastic|matrix\\.is_symmetric|matrix\\.is_triangular|matrix\\.is_zero|matrix\\.kron|matrix\\.max|matrix\\.median|matrix\\.min|matrix\\.mode|matrix\\.mult|matrix\\.pinv|matrix\\.pow|matrix\\.rank|matrix\\.remove_col|matrix\\.remove_row|matrix\\.reverse|matrix\\.row|matrix\\.rows|matrix\\.set|matrix\\.sort|matrix\\.submatrix|matrix\\.sum|matrix\\.swap_columns|matrix\\.swap_rows|matrix\\.trace|matrix\\.transpose|' +
            'map\\.new|map\\.clear|map\\.contains|map\\.copy|map\\.get|map\\.keys|map\\.put|map\\.put_all|map\\.remove|map\\.size|map\\.values|' +
            'request\\.security|request\\.security_lower_tf|request\\.currency_rate|request\\.dividends|request\\.earnings|request\\.financial|request\\.quandl|request\\.seed|request\\.splits|' +
            'indicator|strategy|library';

        // Pine Script Technical Analysis Functions
        var taFunctions =
            'ta\\.accdist|ta\\.alma|ta\\.atr|ta\\.barssince|ta\\.bb|ta\\.bbw|ta\\.cci|ta\\.change|ta\\.cmo|ta\\.cog|ta\\.correlation|ta\\.cross|ta\\.crossover|ta\\.crossunder|ta\\.cum|ta\\.dev|ta\\.dmi|ta\\.ema|ta\\.falling|ta\\.highest|ta\\.highestbars|ta\\.hma|ta\\.iii|ta\\.kc|ta\\.kcw|ta\\.linreg|ta\\.lowest|ta\\.lowestbars|ta\\.macd|ta\\.max|ta\\.mfi|ta\\.min|ta\\.mom|ta\\.obv|ta\\.percentile_linear_interpolation|ta\\.percentile_nearest_rank|ta\\.percentrank|ta\\.pivothigh|ta\\.pivotlow|ta\\.pvi|ta\\.range|ta\\.rising|ta\\.rma|ta\\.roc|ta\\.rsi|ta\\.sar|ta\\.sma|ta\\.stdev|ta\\.stoch|ta\\.supertrend|ta\\.swma|ta\\.tr|ta\\.tsi|ta\\.valuewhen|ta\\.variance|ta\\.vwap|ta\\.vwma|ta\\.wad|ta\\.wma|ta\\.wpr';

        // Pine Script Math Functions
        var mathFunctions =
            'math\\.abs|math\\.acos|math\\.asin|math\\.atan|math\\.avg|math\\.ceil|math\\.cos|math\\.exp|math\\.floor|math\\.log|math\\.log10|math\\.max|math\\.min|math\\.pow|math\\.random|math\\.round|math\\.round_to_mintick|math\\.sign|math\\.sin|math\\.sqrt|math\\.sum|math\\.tan|math\\.todegrees|math\\.toradians';

        // Pine Script String Functions
        var strFunctions =
            'str\\.contains|str\\.endswith|str\\.format|str\\.format_time|str\\.length|str\\.lower|str\\.match|str\\.pos|str\\.replace|str\\.replace_all|str\\.split|str\\.startswith|str\\.substring|str\\.tonumber|str\\.tostring|str\\.upper';

        // Pine Script Input Functions
        var inputFunctions = 'input|input\\.bool|input\\.color|input\\.float|input\\.int|input\\.price|input\\.session|input\\.source|input\\.string|input\\.symbol|input\\.text_area|input\\.time|input\\.timeframe';

        // Pine Script Color Constants
        var colorConstants =
            'color\\.aqua|color\\.black|color\\.blue|color\\.fuchsia|color\\.gray|color\\.green|color\\.lime|color\\.maroon|color\\.navy|color\\.olive|color\\.orange|color\\.purple|color\\.red|color\\.silver|color\\.teal|color\\.white|color\\.yellow|color\\.new|color\\.rgb|color\\.from_gradient|color\\.r|color\\.g|color\\.b|color\\.t';

        // Pine Script Built-in Variables
        var builtinVariables =
            'open|high|low|close|volume|time|bar_index|barstate\\.isconfirmed|barstate\\.isfirst|barstate\\.ishistory|barstate\\.islast|barstate\\.islastconfirmedhistory|barstate\\.isnew|barstate\\.isrealtime|' +
            'syminfo\\.basecurrency|syminfo\\.currency|syminfo\\.description|syminfo\\.mintick|syminfo\\.pointvalue|syminfo\\.prefix|syminfo\\.root|syminfo\\.session|syminfo\\.ticker|syminfo\\.tickerid|syminfo\\.timezone|syminfo\\.type|' +
            'timeframe\\.isdaily|timeframe\\.isdwm|timeframe\\.isintraday|timeframe\\.isminutes|timeframe\\.ismonthly|timeframe\\.isseconds|timeframe\\.isweekly|timeframe\\.multiplier|timeframe\\.period|' +
            'session\\.ismarket|session\\.ispostmarket|session\\.ispremarket';

        // Pine Script Constants
        var constants =
            'shape\\.arrowdown|shape\\.arrowup|shape\\.circle|shape\\.cross|shape\\.diamond|shape\\.flag|shape\\.labeldown|shape\\.labelup|shape\\.square|shape\\.triangledown|shape\\.triangleup|shape\\.xcross|' +
            'location\\.abovebar|location\\.belowbar|location\\.top|location\\.bottom|location\\.absolute|' +
            'size\\.auto|size\\.tiny|size\\.small|size\\.normal|size\\.large|size\\.huge|' +
            'plot\\.style_line|plot\\.style_linebr|plot\\.style_stepline|plot\\.style_steplinebr|plot\\.style_histogram|plot\\.style_cross|plot\\.style_area|plot\\.style_areabr|plot\\.style_columns|plot\\.style_circles|' +
            'hline\\.style_solid|hline\\.style_dashed|hline\\.style_dotted|' +
            'line\\.style_solid|line\\.style_dashed|line\\.style_dotted|line\\.style_arrow_left|line\\.style_arrow_right|line\\.style_arrow_both|' +
            'extend\\.none|extend\\.left|extend\\.right|extend\\.both|' +
            'display\\.none|display\\.all|display\\.data_window|display\\.pane|display\\.price_scale|display\\.status_line';

        var keywordMapper = this.createKeywordMapper(
            {
                keyword: keywords,
                'support.function': builtinFunctions,
                'support.function.ta': taFunctions,
                'support.function.math': mathFunctions,
                'support.function.str': strFunctions,
                'support.function.input': inputFunctions,
                'constant.language': builtinVariables,
                'constant.other': colorConstants + '|' + constants,
            },
            'identifier'
        );

        this.$rules = {
            start: [
                // Comments
                {
                    token: 'comment.line.double-slash',
                    regex: '//@.*$',
                },
                {
                    token: 'comment.line.double-slash',
                    regex: '//.*$',
                },
                {
                    token: 'comment.block',
                    regex: '/\\*',
                    next: 'comment',
                },
                // Strings
                {
                    token: 'string.quoted.double',
                    regex: '"(?:[^"\\\\]|\\\\.)*?"',
                },
                {
                    token: 'string.quoted.single',
                    regex: "'(?:[^'\\\\]|\\\\.)*?'",
                },
                // Numbers
                {
                    token: 'constant.numeric',
                    regex: '\\b(?:0[xX][0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b',
                },
                // Keywords, functions, and variables
                {
                    token: keywordMapper,
                    regex: '[a-zA-Z_][a-zA-Z0-9_\\.]*\\b',
                },
                // Operators
                {
                    token: 'keyword.operator',
                    regex: '\\+|\\-|\\*|\\/|%|==|!=|<=|>=|<|>|:=|\\?|:|=>',
                },
                // Punctuation
                {
                    token: 'punctuation',
                    regex: '[\\[\\]\\(\\)\\{\\},;]',
                },
                // Whitespace
                {
                    token: 'text',
                    regex: '\\s+',
                },
            ],
            comment: [
                {
                    token: 'comment.block',
                    regex: '\\*\\/',
                    next: 'start',
                },
                {
                    defaultToken: 'comment.block',
                },
            ],
        };

        this.normalizeRules();
    };

    oop.inherits(PineScriptHighlightRules, TextHighlightRules);

    var Mode = function () {
        this.HighlightRules = PineScriptHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    (function () {
        this.$id = 'ace/mode/pinescript';
    }.call(Mode.prototype));

    exports.Mode = Mode;
});


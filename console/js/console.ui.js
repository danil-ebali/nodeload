// UI builders and event handlers
// ----------------------------------

// ---------------
// UI creation
// ---------------
var CHART_LEGEND_WIDTH = 70;

var doc, optNodes, frmAddNode, cmdAddNode, cmdAdd, txtNewHost, 
    pnlCharts, pnlRightColumn, pnlSummary;

function initVars() {
    doc = $(document);
    optNodes = $('#optNodes');
    frmAddNode = $('#frmAddNode');
    cmdAddNode = $('#cmdAddNode');
    cmdAdd = $('#cmdAdd');
    txtNewHost = $('#txtNewHost');
    pnlCharts = $('#pnlCharts');
    pnlRightColumn = $('#pnlRightColumn');
    pnlSummary = $('#pnlSummary');
}

// Builds the main UI
function initUI() {
    initVars();

    optNodes.buttonset();
    cmdAddNode.button({
        text: false,
        icons: {
            primary: "ui-icon-plusthick"
        }
    }).click(function(){
        toggleAddNodeDialog();
        return false;
    });
    cmdAdd.click(function() {
        if (frmAddNode.is(':visible') && txtNewHost.val().trim().length > 0) {
            var name = txtNewHost.val();
            hideAddNodeDialog();
            addNode(name);
        }
    });
    
    $(window).resize(function() {
        resizeReportGraphs();
    });

    pnlRightColumn.accordion({ 
        header: "h3",
        autoHeight: false,
    });

    initShortcuts();
}

// Keyboard navigation
function initShortcuts() {
    doc.bind('keydown', 'd', function() {
        if (!frmAddNode.is(':visible')) {
            cmdAddNode.click();
            return false;
        } else if (!txtNewHost.is(':focus')) {
            txtNewHost.focus();
            return false;
        }
    });
    doc.bind('keydown', 'j', function() {
        var prev = optNodes.find('label.ui-state-active').parent().prev();
        if (!prev) return;

        prev.find('input').button().click();
        optNodes.buttonset('refresh');
    });
    doc.bind('keydown', 'k', function() {
        var next = optNodes.find('label.ui-state-active').parent().next();
        if (!next) return;

        next.find('input').button().click();
        optNodes.buttonset('refresh');
    });
    doc.bind('keydown', 'n', function() {
        if (!selectedNode) return;
        var selected = selectedNode.tabs.tabs('option', 'selected');
        selectedNode.tabs.tabs('select', selected-1);
    });
    doc.bind('keydown', 'm', function() {
        if (!selectedNode) return;
        var selected = selectedNode.tabs.tabs('option', 'selected');
        selectedNode.tabs.tabs('select', selected+1);
    });
    
    txtNewHost.bind('keydown', 'esc', function() {
        hideAddNodeDialog();
        return false;
    });
    txtNewHost.bind('keydown', 'return', function() {
        cmdAdd.click();
        return false;
    });
}

// ---------------
// UI Control
// ---------------
var selectedNode = null;
var graphs = {};

function toggleAddNodeDialog() {
    frmAddNode.toggle();
    if (frmAddNode.is(':visible')) {
        txtNewHost.val('').focus();
    } else {
        cmdAdd.focus();
    }
}
function hideAddNodeDialog() {
    cmdAdd.focus();
    frmAddNode.hide();
}
function addNode(name) {
    var node = getNodeObject(name);

    node.button = addNodeButton(node);
    node.tabs = addNodeTabs(node);
    node.selectNode = function() {
        node.button.click();
    }
    node.selectReportGraph = function(index) {
        node.tabs.tabs('select', index);
    }

    refreshReportGraphs(node);

    node.selectNode();
    node.selectReportGraph(0);
}
function removeNode(node) {
    $('#cmd-' + node.id).hide();
    $('#cmd-' + node.id).remove();
    optNodes.buttonset();
    deleteNodeObject(node);
}
function addNodeButton(node) {
    optNodes.append(
        '<span id="cmd-' + node.id + '">\
            <input type="radio" id="' + node.id + '" name="optNodes" checked="true"/>\
            <label for="' + node.id + '">' + node.name + '</label>\
        </span>');
    $('#' + node.id ).button({
        icons: { secondary: 'ui-icon-squaresmall-close' }
    }).click(function() {
        if (selectedNode === node) return;
        if (selectedNode) selectedNode.tabs.hide();
        selectedNode = node;
        selectedNode.tabs.show();
        refreshReportGraphs(node);
    });
    $('#cmd-' + node.id + ' span.ui-icon-squaresmall-close').click(function(){
        removeNode(node);
    });
    optNodes.buttonset();
    return $('#' + node.id);
}
function addNodeTabs(node) {
    var tabs = $('<div id="tab-charts-' + node.id + '">\
                    <div style="float: right; color: gray; margin: 2px 5px 0px 0px">&lt; n &nbsp;&nbsp; m &gt;</div>\
                    <ul></ul>\
                  </div>');
    tabs.appendTo(pnlCharts).tabs();
    tabs.tabs('add', '#tab-console-' + node.id, 'Console: ' + node.name);
    tabs.bind('tabsselect', function(event, ui) {
        node.refreshReportsData();
        refreshReportGraphs(node);
    });
    tabs.hide();
    return tabs;
}

function getTabForReport(node, reportName, reportId) {
    var tabId = '#tab-' + node.id + '-' + reportId,
        tab = $(tabId);

    if (!tab.exists()) {
        node.tabs.tabs('add', tabId, reportName, node.tabs.tabs('length')-1);
        node.tabs.bind('tabsshow', function(event, ui) {
            resizeReportGraphs();
        })
        tab = $(tabId).attr('report-name', name);
    }
    return tab;
}
function resizeReportGraphs() {
    for (var i in graphs) {
        if (graphs[i].container.is(':visible')) {
            graphs[i].resize(graphs[i].container.width() - CHART_LEGEND_WIDTH - 5, graphs[i].container.height());
        }
    }
}
function refreshReportGraphs(node) {
    var reports = node.reports;
    for (var i in reports) {
        // Add tabs for any new reports
        var reportId = getIdFromString(i),
            tab = getTabForReport(node, i, reportId);

        // Add charts from report
        var charts = reports[i].charts;
        for (var j in charts) {
            var chartId = 'chart-' + node.id + '-' + reportId + '-' + getIdFromString(j),
                chartContainerId = chartId + '-container',
                chartLegendId = chartId + '-legend';
            if (!graphs[chartId]) {
                tab.append(
                    '<h2>' + j + '</h2><div id="'+ chartContainerId +'" style="position:relative;width:100%;overflow:hidden"> \
                        <div id="'+ chartId +'" style="height:200px;"/>\
                        <div id="'+ chartLegendId +'" style="position:absolute; display:block; top:0px; right: 0px; min-width:'+ CHART_LEGEND_WIDTH +'px"/>\
                    </div>');
                graphs[chartId] = new Dygraph(
                    document.getElementById(chartId),
                    charts[j].rows,
                    {labelsDiv: $('#' + chartLegendId)[0],
                     labelsSeparateLines: true,
                     labels: charts[j].columns,
                     strokeWidth: 1.5,
                    });
                graphs[chartId].container = $('#' + chartContainerId);
            } else {
                graphs[chartId].updateOptions({"file": charts[j].rows });
            }
        }
    }
    
    pnlSummary.text("Summary data for " + node.id);
}

// ---------------
// Utilities
// ---------------
function jsonToTable(json) {
    var txt = "";
    for (var i in json)
        txt += "<tr><td class=label>" + i + "</td><td>" + json[i] + "</td></tr>";
    return "<table>" + txt + "</table>";
};
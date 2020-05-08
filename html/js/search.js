function sanitizeHTMLEntities(str) {
    if (str && typeof str === 'string') {
        str = str.replace(/</g,"&lt;");
        str = str.replace(/>/g,"&gt;");
        str = str.replace(/&lt;em&gt;/g,"<em>");
        str = str.replace(/&lt;\/em&gt;/g,"<\/em>");
    }
    return str;
}

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false); // false for synchronous request
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

let lastRequest = undefined;
let lastAuthorRequest = undefined;
let baseUrl = window.location.origin + "/search";
let publicKey = "ec060f6090e39c7da73b185b7f35c03f37c508e7a7b1831dbba9b990f24f46f2";  // aclfind

if (window.location.origin.includes("127.0.0.1")) {
    baseUrl = "http://127.0.0.1:7700";
    publicKey = "1cd55f9638d78e1e09d187a37055c941341ca553b6c2a56f7fa42e252edee617";  // local
}

let prevUrl = undefined;
let prevAuthorUrl = undefined;

$(document).ready(function () {
    $(".date-year").datepicker({
        autoclose: true,
        minViewMode: 2,
        format: 'yyyy',
        startDate: '1965',
        endDate: '2020',
        defaultViewDate: '2010',
        clearBtn: true
    });

    $("#as-num-results").data("num_paper", 0);
    $("#as-num-results").data("num_people", 0);

    ["#acl-search-box", "#acl-search-year", "#acl-search-year-cond", "#acl-search-limit"].forEach(
        function(x) {
            $(x).bind("propertychange change click keyup input paste", doSearch);
        }
    );

    var query = $("#acl-search-box").val();
    if (query) {
        doSearch({'target': {'value': query}});
    }
});

function doSearch(e) {
    var query = $("#acl-search-box").val().replace(/\|/g, "");
    if (!query) { return; }
    $("#acl-fulltext-search").attr("href", "https://www.aclweb.org/anthology/search/?q=" + encodeURIComponent(`allintext: ${query} filetype:pdf`));
    query = encodeURIComponent(query);

    var filterExpr = "";
    var filterYear = $("#acl-search-year").val();
    if (filterYear) {
        var filterYearCond = $("#acl-search-year-cond").val();
        switch (filterYearCond) {
        case "lt":
            filterYearCond = "<=";
            break;
        case "gt":
            filterYearCond = ">=";
            break;
        default:
            filterYearCond = "=";
        }
        filterExpr = `year ${filterYearCond} ${filterYear}`;
    }
    var limit = $("#acl-search-limit").val();

    let theUrl = `${baseUrl}/indexes/papers/search?q=${query}&attributesToHighlight=*&attributesToCrop=abstract&limit=${limit}`;
    if (filterExpr) {
        theUrl += "&filters=" + encodeURIComponent(filterExpr);
    }

    console.log(theUrl);
    if (prevUrl && theUrl === prevUrl) { return; }

    if (lastRequest) { lastRequest.abort() }
    lastRequest = new XMLHttpRequest();

    lastRequest.open("GET", theUrl, true);
    lastRequest.setRequestHeader("X-Meili-API-Key", publicKey);
    lastRequest.onload = function(e) {
        if (lastRequest.readyState === 4 && lastRequest.status === 200) {
            let sanitizedResponseText = sanitizeHTMLEntities(lastRequest.responseText);
            let httpResults = JSON.parse(sanitizedResponseText);

            let processingTimeMs = httpResults.processingTimeMs;
            let numberOfDocuments = httpResults.nbHits;
            $("#as-num-results").data("num_paper", numberOfDocuments);
            $("#as-num-results").text(
                $("#as-num-results").data("num_paper") + $("#as-num-results").data("num_people")
            );
            $("#as-duration").text(processingTimeMs);
            $("#as-results-container").empty();

            for (result of httpResults.hits) {
                if (result.abstract.substring(0, 10) != result._formatted.abstract.substring(0, 10)) {
                    result._formatted.abstract = "... " + result._formatted.abstract;
                }
                if (result.abstract.substring(result.abstract.length - 10) != result._formatted.abstract.substring(result._formatted.abstract.length - 10)) {
                    result._formatted.abstract = result._formatted.abstract + " ...";
                }

                const element = {...result, ...result._formatted };
                delete element._formatted;

                let elem = $("#as-result-template").clone();
                elem.attr("id", "");

                let title = elem.find(".meili-title");
                title.html(element.title);
                title.attr("href", element.url);
                //let authors = elem.find(".meili-authors");
                //authors.empty();
                let authorspan = undefined;
                element.author.split(" ||| ").forEach(function(a, i) {
                    if (!a) return;
                    var author = jQuery("<a></a>", {
                        "href": `https://www.aclweb.org/anthology/people/${element.author_ids[i][0]}/${element.author_ids[i]}`,
                        "html": a
                    });
                    if (authorspan) {
                        authorspan.append(" | ");
                    } else {
                        authorspan = jQuery("<span>");
                    }
                    authorspan.append(author);
                });
                if (authorspan) {
                    elem.find(".meili-authors").html(authorspan);
                }
                elem.find(".meili-venue").html(element.venue);
                elem.find(".meili-year").html(element.year);
                elem.find(".meili-pdf").attr("href", element.pdf);

                if (element.abstract === "") {
                    elem.find(".meili-abstract").remove();
                } else {
                    elem.find(".meili-abstract").html(element.abstract);
                }

                elem.appendTo("#as-results-container");
            }
        } else {
            console.error(lastRequest.statusText);
        }
    };
    lastRequest.send(null);
    prevUrl = theUrl;

    // a bit messy -- now do the same for people index
    let theAuthorUrl = `${baseUrl}/indexes/people/search?q=${query}&attributesToHighlight=*&limit=5`;
    console.log(theAuthorUrl);
    if (prevAuthorUrl && theAuthorUrl === prevAuthorUrl) { return; }

    if (lastAuthorRequest) { lastAuthorRequest.abort() }
    lastAuthorRequest = new XMLHttpRequest();

    lastAuthorRequest.open("GET", theAuthorUrl, true);
    lastAuthorRequest.setRequestHeader("X-Meili-API-Key", publicKey);
    lastAuthorRequest.onload = function(e) {
        if (lastAuthorRequest.readyState === 4 && lastAuthorRequest.status === 200) {
            let sanitizedResponseText = sanitizeHTMLEntities(lastAuthorRequest.responseText);
            let httpResults = JSON.parse(sanitizedResponseText);

            let numberOfDocuments = httpResults.nbHits;
            $("#as-num-results").data("num_people", numberOfDocuments);
            $("#as-num-results").text(
                $("#as-num-results").data("num_paper") + $("#as-num-results").data("num_people")
            );

            $("#as-authorresults-container").empty();
            for (result of httpResults.hits) {
                const element = {...result, ...result._formatted };
                delete element._formatted;

                let elem = $("#as-authorresult-template").clone();
                elem.attr("id", "");

                let name = elem.find(".meili-author");
                name.html(element.name);
                name.attr("href", element.url);
                elem.find(".meili-authoricon").attr("href", element.url);
                elem.find(".meili-pubcount").text(element.pubcount);
                if (element.pubcount > 1) {
                    elem.find(".meili-pubcount-plural").show();
                } else {
                    elem.find(".meili-pubcount-plural").hide();
                }
                elem.appendTo("#as-authorresults-container");
            }
        } else {
            console.error(lastAuthorRequest.statusText);
        }
    };
    lastAuthorRequest.send(null);
    prevAuthorUrl = theAuthorUrl;

}

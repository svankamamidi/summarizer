import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

var sudhakarAlgo = true;
// Reference the elements that we will need
const fileUpload = document.getElementById('file-upload');
var { pdfjsLib } = globalThis;
pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.mjs';

// Create a new object detection pipeline
//const generator = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
const generator = await pipeline('summarization', 'Xenova/t5-small');
//const generator = await pipeline('summarization', 'Xenova/LaMini-Flan-T5-783M');

fileUpload.addEventListener('change', function (e) {
    $('.loader').css('display','block');
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = function (e2) {
        var typedarray = new Uint8Array(this.result);
        const loadingTask = pdfjsLib.getDocument(typedarray);
        extract(loadingTask);
        //detect();
    };
    reader.readAsArrayBuffer(file);
});

var aggregatedSummary = "";
function extract(loadingTask){
    aggregatedSummary = "";
    // Asynchronous download of PDF
    //pdfjsLib.getDocument(url);

    loadingTask.promise.then(function(pdf) {
      console.log('PDF loaded');
      var pdfDocument = pdf;
      var pagesPromises = [];
      var pagesSummary = [];
      
      for (var i = 0; i < pdf.numPages; i++) {
          // Required to prevent that i is always the total of pages
          (function (pageNumber) {
              pagesPromises.push(getPageText(pageNumber, pdfDocument));
          })(i + 1);
      }

      Promise.all(pagesPromises).then(function (pagesText) {      
          for(var i = 0;i < pagesText.length;i++){
            //Gather summary for each page!
            (function (pageNumber) {
              console.log("page " + pageNumber + " " + pagesText[i]);  
              pagesSummary.push(pageSummary(pagesText[i], pageNumber));
            })(i);

            Promise.all(pagesSummary).then(function (pagesText) {      
              $('.loader').css('display','none');
              downloadFile(aggregatedSummary);
              //$("#pdf-text").append("<div><h3>Page "+ (i + 1) +"</h3><p>"+pagesText[i]+"</p><br></div>")
            });
          }          
      });
    }, function (reason) {
      // PDF loading error
      console.error(reason);
    });
}

function getPageText(pageNum, PDFDocumentInstance) {
  // Return a Promise that is solved once the text of the page is retrieven
  return new Promise(function (resolve, reject) {
      PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
          // The main trick to obtain the text of the PDF page, use the getTextContent method
          pdfPage.getTextContent().then(function (textContent) {
              var textItems = textContent.items;
              var finalString = "";

              // Concatenate the string of the item to the final string
              for (var i = 0; i < textItems.length; i++) {
                  var item = textItems[i];
                  finalString += item.str + " ";
              }

              // Solve promise with the text retrieven from the page
              resolve(finalString);
          });
      });
  });
}

function downloadFile(content){
   const link = document.createElement("a");
   //const content = document.querySelector("textarea").value;
   const file = new Blob([content], { type: 'text/plain' });
   link.href = URL.createObjectURL(file);
   link.download = "summary.txt";
   link.click();
   URL.revokeObjectURL(link.href);
}

async function summary(inputText, pageNum) {    
    //console.log("text " + inputText);
    const output = await generator(inputText, {
      max_new_tokens: 300,//document.getElementById("condence-words").value,
    });    
    //console.log(output);
    aggregatedSummary = aggregatedSummary + pageNum + " - " + output[0].summary_text + "\n\n";
    return;
}

async function pageSummary(inputText, pageNum) {
  var pageTextArray = splitIntoSummarizableStrings(inputText);
  var pageSummary = process_full_contents(pageTextArray);
  console.log(pageNum + " " + pageSummary);
  aggregatedSummary = aggregatedSummary + pageNum + " - " + pageSummary + "\n\n";    
}


async function summary2(inputText, pageNum) {
    
    //console.log("text " + inputText);
    const output = await generator(inputText, {
      max_new_tokens: 300,//document.getElementById("condence-words").value,
    });    
    console.log(output);
    //aggregatedSummary = aggregatedSummary + pageNum + " - " + output[0].summary_text + "\n\n";
    return output[0].summary_text;
}

function process_full_contents(textChunks){
  var aggregatedSummaryLines = [];
  var concatanatedTextLines = "";
  for (const textLine of textChunks) {
      if (textLine && textLine.length > 0){        
        //if word count is less than 380 words continue concatanation
        if (concatanatedTextLines.split(/\s+/).length < 360) {//380
            concatanatedTextLines = concatanatedTextLines + textLine + ".";
            //print("textLine: " + textLine)
        }
        else{
            //get summary and append it to new output ie aggregatedSummaryLines
            console.log("concatanatedTextLines: " + concatanatedTextLines);
            aggregatedSummaryLines.push(summary2(concatanatedTextLines));       
            console.log("aggregatedSummaryLine: " + aggregatedSummaryLines.join());
            concatanatedTextLines = "";
        }
      }
  }
  if (concatanatedTextLines && concatanatedTextLines.length > 0){
      aggregatedSummaryLines.push(summary2(concatanatedTextLines));
      concatanatedTextLines = "";
  }
  var aggregatedSummaryStr = aggregatedSummaryLines.join();
  if (aggregatedSummaryStr && aggregatedSummaryStr.split(/\s+/).length <= 2000) {//go for 120 words instead of 2000
      return aggregatedSummaryStr;
  }
  else if (aggregatedSummaryLines && aggregatedSummaryLines.length > 0){
      return process_full_contents(aggregatedSummaryLines);
  }
}

/**
* Returns array of strings with words less than or equal to 380
* First split at periods (full stops)
*/
function splitIntoSummarizableStrings(pageText){
  return pageText.split(".");
}

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

// Reference the elements that we will need
const fileUpload = document.getElementById('file-upload');
var { pdfjsLib } = globalThis;
pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.mjs';

// Create a new object detection pipeline
const generator = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
const text = 'The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, ' +
  'and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. ' +
  'During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest ' +
  'man-made structure in the world, a title it held for 41 years until the Chrysler Building in New ' +
  'York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to ' +
  'the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the ' +
  'Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second ' +
  'tallest free-standing structure in France after the Millau Viaduct.';

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

function extract(loadingTask){
    // Asynchronous download of PDF
    //pdfjsLib.getDocument(url);

    loadingTask.promise.then(function(pdf) {
      console.log('PDF loaded');
    var pdfDocument = pdf;
      var pagesPromises = [];


      for (var i = 0; i < pdf.numPages; i++) {
          // Required to prevent that i is always the total of pages
          (function (pageNumber) {
              pagesPromises.push(getPageText(pageNumber, pdfDocument));
          })(i + 1);
      }

      Promise.all(pagesPromises).then(function (pagesText) {
          // Remove loading
          $("#loading-info").remove();

          // Render text
          for(var i = 0;i < pagesText.length;i++){
            $("#pdf-text").append("<div><h3>Page "+ (i + 1) +"</h3><p>"+pagesText[i]+"</p><br></div>")
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

// Detect objects in the image
async function detect(img) {
    
    console.log("text " + text);
    const output = await generator(text, {
      max_new_tokens: 100,
    });
    $('.loader').css('display','none');
    console.log(output);
}


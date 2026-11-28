// The official UNC seal as a data: URL, for generated documents.
//
// The asset is the exact image embedded in the Registrar's Syllabus_TEMPLATE.docx
// (word/media/image2.png, 312×303, transparent). It is embedded rather than
// linked so it always shows: in the blob-URL preview iframe, when printing, and
// in Download PDF (html2canvas cannot read some cross-origin or blob-relative
// images and leaves an empty box). Fetched once, then cached.
import sealUrl from '../assets/unc-seal-official.png';

let pending = null;

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Could not read the seal image.'));
  reader.readAsDataURL(blob);
});

export const getSealDataUrl = () => {
  if (!pending) {
    pending = fetch(sealUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load the UNC seal (' + res.status + ').');
        return res.blob();
      })
      .then(readAsDataUrl)
      .catch((err) => { pending = null; throw err; });
  }
  return pending;
};

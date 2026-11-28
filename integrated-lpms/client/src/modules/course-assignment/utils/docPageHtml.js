// The official UNC form page, shared by every generated document
// (ported from feature/learning-plan-submissions-management-v2
// composition/client/src/utils/syllabusPdfHtml.js: pageHeader, pageFooter, head CSS).
//
//   Page: landscape long bond, 330 × 216 mm (both templates: w:w=18722 w:h=12242),
//     padding 42px 85px 32px 85px.
//   Header on every page: seal | four centred lines | Doc. Control No.
//   Footer on every page: Effectivity · Revision No. · Page No. x of y.
//
// The two forms share the page and footer but not the header (see FORM_HEADERS):
//   Syllabus_TEMPLATE.docx            COURSE SYLLABUS, bold upper case, UNC-FM-VPAA-01
//   [TOS] ACT222L FINAL(CASIMERO).docx TABLE OF SPECIFICATION, regular 11 pt, UNC-FM-VPAA-05 (bold)
import { escapeHtml, imageDataSrc } from './sanitize.js';

// A form value: escaped; `fallback` when missing (the TOS form leaves it blank).
const formValue = (v, fallback = '') => (v === null || v === undefined || v === '' ? fallback : escapeHtml(String(v)));

/**
 * Header descriptors, one per official form.
 *   lines        the four centred lines: { text, size, weight }
 *   titleWeight  the weight of the title line (line 2), for reference
 *   control      the Doc. Control No. cell: label/value size and weight, alignment,
 *                and what to print when the number is missing
 */
export const FORM_HEADERS = {
  syllabus: {
    titleWeight: 'bold',
    lines: [
      { text: 'UNIVERSITY OF NUEVA CACERES', size: '10.5pt', weight: 'bold' },
      { text: 'COURSE SYLLABUS', size: '10.5pt', weight: 'bold' },
      { text: 'Form', size: '10pt', weight: 'normal' },
      { text: 'OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS', size: '10pt', weight: 'bold' },
    ],
    control: { size: '9pt', labelWeight: 'bold', valueWeight: 'normal', align: '', missing: '—' },
  },
  tos: {
    titleWeight: 'normal',
    lines: [
      { text: 'UNIVERSITY OF NUEVA CACERES', size: '11pt', weight: 'normal' },
      { text: 'TABLE OF SPECIFICATION', size: '11pt', weight: 'normal' },
      { text: 'Form', size: '11pt', weight: 'normal' },
      { text: 'Office of the Vice President for Academic Affairs', size: '11pt', weight: 'normal' },
    ],
    // The form's right cell is 2385 twips (≈ 159 px): wide enough for "UNC-FM-VPAA-05" on one line.
    control: { size: '10pt', labelWeight: 'normal', valueWeight: 'bold', align: 'center', missing: '', width: '150px' },
  },
};

/**
 * pageHeader(logo, form) — `form` is a FORM_HEADERS descriptor plus the form's
 * docControlNo: { ...FORM_HEADERS.tos, docControlNo: 'UNC-FM-VPAA-05' }.
 * For the syllabus this is the v2 markup unchanged, except that the seal keeps
 * its aspect ratio (height:auto, not 68px).
 */
export const pageHeader = (logo, form = FORM_HEADERS.syllabus) => {
  const seal = imageDataSrc(logo);
  const c = form.control || FORM_HEADERS.syllabus.control;
  const align = c.align ? ` text-align:${c.align};` : '';
  const cw = c.width || '120px';
  return `<table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:8px;">
  <tr>
    <td style="width:80px; min-width:80px; max-width:80px; padding:4px; border:1px solid #000; text-align:center; vertical-align:middle;">
      ${seal ? `<img src="${seal}" style="width:68px; height:auto;">` : ''}
    </td>
    <td style="text-align:center; vertical-align:middle; padding:6px; border:1px solid #000;">
${form.lines.map((l) => `      <div style="font-size:${l.size}; font-weight:${l.weight}; color:#000; line-height:1.35;">${escapeHtml(l.text)}</div>`).join('\n')}
    </td>
    <td style="width:${cw}; min-width:${cw}; max-width:${cw}; padding:5px 8px; vertical-align:middle; border:1px solid #000;">
      <div style="font-size:${c.size}; font-weight:${c.labelWeight}; color:#000;${align}">Doc. Control No.:</div>
      <div style="font-size:${c.size}; font-weight:${c.valueWeight}; color:#000;${align}">${formValue(form.docControlNo, c.missing)}</div>
    </td>
  </tr>
</table>`;
};

export const pageFooter = (pageNum, total, form = {}) => `<div class="doc-footer" style="position:absolute; left:85px; right:85px; bottom:26px; display:flex; justify-content:space-between; padding-top:4px; font-size:8.5pt; font-family:Arial,Helvetica,sans-serif;">
  <span>Effectivity: ${formValue(form.effectivity)}</span>
  <span>Revision No.: ${formValue(form.revisionNo)}</span>
  <span>Page No.: <span class="pgno">${pageNum}</span> of <span class="pgtot">${total}</span></span>
</div>`;

export const docHead = (title, extraCss = '') => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1247">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* No mobile text autosizing: the sheets must lay out (and break) the same on every device. */
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  html, body { overflow: hidden; background: transparent; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; line-height: 1.35; overflow-wrap: break-word; word-break: normal; }
  .page { box-sizing: border-box; position: relative; display: flex; flex-direction: column; background: #fff; }
  .page > * { flex-shrink: 0; }
  @media screen {
    .page { box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin: 24px auto; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; }
    /* Before the measuring script has run (or if it cannot), a page grows instead of clipping. */
    .page.unpaged { height: auto; min-height: 216mm; padding-bottom: 64px; }
  }
  @media print {
    html, body { overflow: visible; }
    .page { box-shadow: none; margin: 0; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; break-after: auto; }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  @page { size: 330mm 216mm; margin: 0; }

  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #000; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
  th { background: #404040; color: #fff; font-weight: 700; text-align: center; font-size: 9pt; vertical-align: middle; }
  td.center, th.center { text-align: center; }
  td.num { text-align: center; white-space: nowrap; }
  tr { break-inside: avoid; }

  .course-details-table { margin-bottom: 3mm; font-size: 9.5pt; }
  .course-details-table td { padding: 3px 6px; vertical-align: top; }
  .course-details-table td.label { font-weight: bold; width: 17%; }
  .course-details-table td.value { width: 33%; }

  .section-row td { background: #bfbfbf; font-weight: bold; }
${extraCss}
</style>
</head>
<body>`;

// Measured re-pagination for documents made of one long table.
//
// The builder writes everything onto a single "unpaged" sheet. After layout, this
// moves whole table rows onto fresh sheets so each sheet fills up to just above
// its footer — a row is never cut in half — repeats the table header on every
// sheet, keeps a section heading with the row after it, puts the closing block
// (signatures) on the last sheet, and renumbers "Page No. x of y". Runs in the
// preview iframe, in print, and before Download PDF. Any error leaves the
// unpaged sheet as is (it grows instead of clipping).
export const REPAG_SCRIPT = `<script>
(function(){
  function renumber(){
    var all=document.querySelectorAll('.page');
    for(var i=0;i<all.length;i++){
      var n=all[i].querySelector('.pgno');if(n)n.textContent=String(i+1);
      var t=all[i].querySelector('.pgtot');if(t)t.textContent=String(all.length);
    }
    document.body.setAttribute('data-paginated','1');
  }
  function footLimit(pg){
    var f=pg.querySelector('.doc-footer');
    return f?f.getBoundingClientRect().top-6:1e9;
  }
  function repaginate(){
    try{
      var tpl=document.querySelector('.page.flow-pg');
      if(!tpl){renumber();return;}
      var table=tpl.querySelector('table.flow-table');
      var tbody=table&&table.tBodies[0];
      if(!tbody){tpl.classList.remove('unpaged');renumber();return;}
      var rows=Array.prototype.slice.call(tbody.rows);
      var tail=tpl.querySelector('.flow-tail');
      if(tail)tail.parentNode.removeChild(tail);
      // An empty template for continuation sheets: no first-page-only blocks.
      var contTpl=tpl.cloneNode(true);
      var firstOnly=contTpl.querySelectorAll('.first-only');
      for(var f=0;f<firstOnly.length;f++)firstOnly[f].parentNode.removeChild(firstOnly[f]);
      var ctb=contTpl.querySelector('table.flow-table').tBodies[0];
      while(ctb.firstChild)ctb.removeChild(ctb.firstChild);
      while(tbody.firstChild)tbody.removeChild(tbody.firstChild);
      tpl.classList.remove('unpaged');
      contTpl.classList.remove('unpaged');
      if(tpl.getBoundingClientRect().height<200){ // no real layout: leave one sheet
        rows.forEach(function(r){tbody.appendChild(r);});if(tail)tpl.appendChild(tail);renumber();return;
      }
      var cur=tpl,tb=tbody,limit=footLimit(cur);
      function newSheet(){
        var pg=contTpl.cloneNode(true);
        cur.parentNode.insertBefore(pg,cur.nextSibling);
        cur=pg;tb=pg.querySelector('table.flow-table').tBodies[0];limit=footLimit(pg);
      }
      for(var i=0;i<rows.length;i++){
        var tr=rows[i];
        tb.appendChild(tr);
        if(tr.getBoundingClientRect().bottom>limit && tb.rows.length>1){
          tb.removeChild(tr);
          // carry trailing section headings along so none is left alone at the bottom
          var carry=[];
          while(tb.rows.length>1 && tb.rows[tb.rows.length-1].classList.contains('keep-next')){
            carry.unshift(tb.rows[tb.rows.length-1]);tb.removeChild(tb.rows[tb.rows.length-1]);
          }
          newSheet();
          carry.forEach(function(c){tb.appendChild(c);});
          tb.appendChild(tr);
        }
      }
      if(tail){
        cur.appendChild(tail);
        if(tail.getBoundingClientRect().bottom>footLimit(cur)){
          cur.removeChild(tail);
          newSheet();
          var t=cur.querySelector('table.flow-table');if(t)t.parentNode.removeChild(t);
          cur.appendChild(tail);
        }
      }
      renumber();
    }catch(e){try{renumber();}catch(_){}}
  }
  function start(){
    var imgs=Array.prototype.slice.call(document.images).filter(function(im){return !im.complete;});
    var go=function(){ (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(repaginate,0);}); };
    if(!imgs.length){go();return;}
    var left=imgs.length;imgs.forEach(function(im){var d=function(){if(--left===0)go();};im.addEventListener('load',d);im.addEventListener('error',d);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export const docFoot = REPAG_SCRIPT + '</body></html>';

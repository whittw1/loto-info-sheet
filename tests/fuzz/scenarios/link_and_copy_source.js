// A: saved unit with an In/Out pair (qty 2) and an Electrical source (qty 1)
await unit('Target Unit', [{ energySource: 'HHW In/Out', deviceType: 'Ball Valve', quantity: 2, verification: 'Temp Only - Hot' }, { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' }]);
performSaveAndNew(); await idle();
const r = {};
// 1. link a blank source to the In/Out pair
await unit('Linker', [{ energySource: '', deviceType: '', quantity: 1 }]);
pendingLinkSourceIndex = 0; applyLink(0, 0); await sleep(200);
r.linkedSource = { energy: sources[0].energySource, qty: sources[0].quantity, exportsAs: sources[0].energySource + ' ×' + sources[0].quantity };
clearForm(false);
// 2. copy the qty-1 Electrical source onto a photographed, marked qty-2 source
await unit('Copier', [{ energySource: 'CHW In/Out', deviceType: 'Butterfly', quantity: 2, verification: 'GaugeOnly - CHW' }]);
handlePhoto({ files: [await makePhoto()] }, 'source_0'); await idle();
photos.source_0 = Object.assign({}, photos.source_0, { marks: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }] });
showCopySourceDialog(0); applyCopySource(0, 1); await sleep(200);
r.afterCopy = { energy: sources[0].energySource, qty: sources[0].quantity, storedMarks: (photos.source_0.marks || []).length, toastSaysCleared: toasts.some(t => /Valve marks cleared/.test(t)) };
updateSource(0, 'quantity', 2); await sleep(200);
r.afterQtyBackTo2 = { qty: sources[0].quantity, storedMarks: (photos.source_0.marks || []).length, exportedMarks: sourceMarksForExport({ sources, photos }, 0) };
return r;

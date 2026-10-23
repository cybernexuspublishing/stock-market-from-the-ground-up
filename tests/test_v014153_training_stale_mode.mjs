/* D13 client chronology contract: old async grades must not render in a new Lab. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const training=readFileSync('assets/js/interactive-training.js','utf8');
const player=readFileSync('assets/js/lab-player.js','utf8');
assert(training.includes('let mount=null,epoch=0'),'Training should have a monotonic UI generation');
assert(training.includes('const requestedEpoch=++epoch'),'Every fresh Lab begins a new generation');
assert(training.includes('requestedEpoch!==epoch||mount!==target||!target.isConnected'),
 'Async training start must never render in a switched Lab');
assert(training.includes('renderedEpoch!==epoch||!mount?.isConnected'),
 'Answer/resume must ignore stale or disconnected mount');
assert(training.includes('function cancel(){epoch++;mount=null;'),
 'Cancel must invalidate old assessment references');
assert(training.includes('return{begin,cancel}'),'Cancel API exposed to Lab player');
assert(player.includes('window.GroundUpInteractiveTraining?.cancel?.()'),
 'Lab mode rerender cancels stale assessment');
assert(player.includes("q('v014-training-slot')!==launchedBox"),
 'Old completion callbacks must not alter new Lab view');
assert(training.includes("call('answer','POST',{attemptId,answer:ans,expectedStep:step})"),
 'Existing backend grading and expected-step concurrency protection preserved');
assert(training.includes("call('resume','GET')"),'Existing server-owned resume retained');
assert(!/rubricKey|correctAnswer|gradeLocally/.test(training),'Private answer keys remain off browser');
console.log('PASS D13 stale Lab/mode response suppression and unchanged server-owned grading boundary');

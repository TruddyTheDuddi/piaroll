// Note types
const NOTE_TYPE = {
    NOTE: "note",
    REST: "rest"
}

function normalizeLength([num, den]) {
    while (num % 2 == 0 && den >= 2) {
        num /= 2;
        den /= 2;
    }

    return [num, den];
}

function lengthPlus(len1, len2) {
    // assertion: both lens have den=2^x for possibly different x
    if (len1[1] > len2[1]) {
        let x = len1;
        len1 = len2;
        len2 = x;
    }

    let [num1, den1] = len1;
    let [num2, den2] = len2;

    num1 *= den2 / den1;

    return normalizeLength([num1 + num2, den2]);
}

function lengthMinus(len1, [num2, den2]) {
    return lengthPlus(len1, [-num2, den2]);
}

/** splits the length if it appears at a zero-based position in a
 * bar of length total. Return value is an array of noteLength objects
 * and nulls (indicating bar breaks)
 * 
 * length, pos, total: length arrays
 * base (optional): noteLength object representing length
 */
function lengthAlign(length, pos, total, base = null) {
    // assertion: length is normalized
    let remaining = lengthMinus(total, pos);

    if (remaining[0] > 0) {
        if (lengthMinus(remaining, length)[0] >= 0) {
            // if the note fits, ...
            if (base != null) {
                // if we already have a noteLength object for that length -> use it
                return [base];
            } else {
                // otherwise we only try to build the note length
                remaining = length;
            }
        }

        // find a regular note length (undotted) that fits in remaining
        let num = 2;
        while (num <= remaining[0]) num *= 2;
        num /= 2;
        // -- or const num = Math.pow(2, Math.floor(Math.log2(remaining[0])));

        const [newNum, newDet] = normalizeLength([num, remaining[1]]);
        let newNoteLen = LENGTHS_BY_DEN[newDet];

        // check whether a dotted length still fits
        // but don't add dotted wholes, if we can add two wholes, hence the if
        if ((newDet > 1 || newNum == 1) && newNoteLen.dotted) {
            const dottedLen = newNoteLen.dotted();
            if (lengthMinus(remaining, dottedLen.length)[0] >= 0) {
                newNoteLen = dottedLen;
            }
        }

        // return (and recurse)
        const newLength = lengthMinus(length, newNoteLen.length);
        if (newLength[0] > 0) {
            // we didn't fit the entire length -> recurse
            const newPos = lengthPlus(pos, newNoteLen.length);
            return [newNoteLen, ...lengthAlign(newLength, newPos, total)];
        } else {
            return [newNoteLen];
        }
    } else {
        // bar full, start new one
        return [null, ...lengthAlign(length, [0, 1], total, base)];
    }
}

function noteLength(len) {
    return {
        dotted: function() {
            const len = this.length;
            return noteLength({
                name: this.name + ".",
                length: [3 * len[0], 2 * len[1]],
            });
        },
        /** splits the length if it appears at a zero-based position in a
         * bar of length total. Return value is an array of lengths 
         * and nulls (indicating bar breaks)
         */
        align: function(pos, total) {
            // TODO reorder subnotes to align nicely
            return lengthAlign(this.length, pos, total, this);
        },
        ...len,
    };
}

function fit_notes(notes, bar_pos, bar_len) {
    let out = [];
    for (const note of notes) {
        const lens = note.length.align(bar_pos, bar_len);
        for (const len of lens) {
            out.push(len != null
                ? { length: len, source: note }
                : null);
        }

        bar_pos = lengthPlus(bar_pos, note.length.length);
        bar_pos[0] = bar_pos[0] % bar_pos[1];
        if (bar_pos[0] == 0) {
            out.push(null);
        }
    }
    return out;
}

function draw_bars(elements) {
    return elements.map((element) => {
        if (element == null) {
            return "|";
        } else {
            // TODO ligature for same source
            const [num, den] = element.length.length;
            return "G" + num + "/" + den;
        }
    }).join("");
}

function render() {
    // TODO try to split groups of notes
    const notes = fit_notes(timeline.editor, [0, 1], [1, 1]);
    const noteString = draw_bars(notes);
    window.ABCJS.renderAbc("renderoutput", "X:1\nL:1/1\nK:C\nM:C\n" + noteString);
}

const LENGTHS = {
    whole: noteLength({
        name: "1",
        length: [1, 1],
    }),
    half: noteLength({
        name: "2",
        length: [1, 2],
    }),
    quarter: noteLength({
        name: "4",
        length: [1, 4],
    }),
    eighth: noteLength({
        name: "8",
        length: [1, 8],
    }),
    sixteenth: noteLength({
        name: "16",
        length: [1, 16],
        dotted: false,
    })
}

const LENGTHS_BY_DEN = {1: LENGTHS.whole, 2: LENGTHS.half, 4: LENGTHS.quarter, 8: LENGTHS.eighth, 16: LENGTHS.sixteenth}

// Define the existing notes
const MUSIC_NOTES = {
    whole : {
        name: "whole",
        technicalName: "semibreve",
        duration: LENGTHS.whole,
        type: NOTE_TYPE.NOTE,
        img: "img/note/whole.svg"
    },
    half : {
        name: "half",
        technicalName: "minim",
        duration: LENGTHS.half,
        type: NOTE_TYPE.NOTE,
        img: "img/note/half.svg"
    },
    quarter : {
        name: "quarter",
        technicalName: "crotchet",
        duration: LENGTHS.quarter,
        type: NOTE_TYPE.NOTE,
        img: "img/note/quarter.svg"
    },
    eighth : {
        name: "eighth",
        technicalName: "quaver",
        duration: LENGTHS.eighth,
        type: NOTE_TYPE.NOTE,
        img: "img/note/eighth.svg"
    },
    sixteenth : {
        name: "sixteenth",
        technicalName: "semiquaver",
        duration: LENGTHS.sixteenth,
        type: NOTE_TYPE.NOTE,
        img: "img/note/sixteenth.svg"
    },
    restWhole : {
        name: "restWhole",
        technicalName: "restWhole",
        duration: LENGTHS.whole,
        type: NOTE_TYPE.REST,
        img: "img/rest/whole.svg"
    },
    restHalf : {
        name: "restHalf",
        technicalName: "restHalf",
        duration: LENGTHS.half,
        type: NOTE_TYPE.REST,
        img: "img/rest/half.svg"
    },
    restQuarter : {
        name: "restQuarter",
        technicalName: "restQuarter",
        duration: LENGTHS.quarter,
        type: NOTE_TYPE.REST,
        img: "img/rest/quarter.svg"
    },
    restEighth : {
        name: "restEighth",
        technicalName: "restEighth",
        duration: LENGTHS.eighth,
        type: NOTE_TYPE.REST,
        img: "img/rest/eighth.svg"
    },
    restSixteenth : {
        name: "restSixteenth",
        technicalName: "restSixteenth",
        duration: LENGTHS.sixteenth,
        type: NOTE_TYPE.REST,
        img: "img/rest/sixteenth.svg"
    }
};

// Render test
let notes = [
    MUSIC_NOTES.whole,
    MUSIC_NOTES.half,
    MUSIC_NOTES.quarter,
    MUSIC_NOTES.eighth,
    MUSIC_NOTES.sixteenth
]

let rests = [
    MUSIC_NOTES.restWhole,
    MUSIC_NOTES.restHalf,
    MUSIC_NOTES.restQuarter,
    MUSIC_NOTES.restEighth,
    MUSIC_NOTES.restSixteenth
]

// Create the note selector
createNoteSelector();

// Dotted symbol (WIP, add updating to designs)
const dotter = document.getElementById("dotter"); //checkbox
dotter.addEventListener("click", () => {
    timeline.currentNote.dotted = dotter.checked;
});

/**
 * Creates the note selector by adding the notes and rests
 * elements to it.
 */
function createNoteSelector(){
    let prevNote = null; // For styling purposes, keep track of the previous selected note (element)
    
    let notesBox = document.getElementById("notes");
    notes.forEach(note => {
        notesBox.appendChild(createBox(note));
    });

    let restsBox = document.getElementById("rests");
    rests.forEach(rest => {
        restsBox.appendChild(createBox(rest));
    });

    function createBox(note){
        let box = document.createElement("label");
        let noteImg = document.createElement("img");
        
        // Image of the note
        noteImg.src = note.img;
        noteImg.classList.add("noteImg");
        box.appendChild(noteImg);

        // Radio button for selection
        let radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "selected_note";
        radio.value = note.name;
        radio.classList.add("noteRadio");
        box.appendChild(radio);

        // Styling on selection
        radio.addEventListener("change", function(){
            // Remove the selected class from the previous selected note
            if(prevNote != null){
                prevNote.classList.remove("selected");
            }
            box.classList.add("selected");
            prevNote = box;
        });

        // Set the seleted note in timeline
        radio.addEventListener("click", function(){
            timeline.currentNote.note = note;
        });
        
        // By default select the quarter
        if(note.name == "quarter"){
            radio.checked = true;
            box.classList.add("selected");
            prevNote = box;
        }

        box.classList.add("select-box");
        box.classList.add(note.type);
        return box;
    }
}


// Timeline object contains the operations on the timeline and keeps track of the notes added
let timeline = {
    el: document.getElementById("timeline"),

    // Keep track of the notes added to the timeline
    editor: [],

    // Add a note to the timeline at a specific position
    insert: function(note, pos = null){
        if(pos == null){
            this.editor.push(note);
            // Add to the DOM, last -1 because of the adder element
            this.el.insertBefore(note.noteEl, symbolAdder);
        } else {
            this.editor.splice(pos, 0, note);
            this.el.insertBefore(note.noteEl, this.el.children[pos]);
        }
        render();
    },

    // Remove a note from the timeline
    remove: function(note){
        let index = this.editor.indexOf(note);
        if(index > -1){
            this.editor.splice(index, 1);
        }
        render();
    },

    // Clear the timeline (doesn't work because it will also remove editor element, fix later)
    clearAll: function(){
        this.editor = [];
        this.el.innerHTML = "";
    },

    // Keep track of the current symbole (note/rest) that was selected
    currentNote: {
        note: MUSIC_NOTES.quarter,
        dotted: false,
    }
};


// You're able to add notes by clicking on the timeline's adder element
const symbolAdder = document.getElementById("symbolAdder");
symbolAdder.addEventListener("click", () => {
    registerTimelineNote();
});

function registerTimelineNote(pos = null){
    // Create the note graphics
    let noteRaw = createTimelineNote(timeline.currentNote);

    // This will be put in the timeline object
    let newNote = {
        noteEl : noteRaw.noteEl,
        length: createTimelineLength(timeline.currentNote),
    };

    if (timeline.currentNote.dotted) {
        newNote.length = newNote.length.dotted();
    }

    // Deleteing the note
    noteRaw.deleteTrigger.addEventListener("click", () => {
        timeline.remove(newNote);
        newNote.noteEl.remove();
    });

    // Inserting the note inbwetween two notes
    noteRaw.insertTrigger.addEventListener("click", () => {
        registerTimelineNote(timeline.editor.indexOf(newNote));
    });

    // Add the note to the timeline
    timeline.insert(newNote, pos);
    
    // Scroll timeline to the end
    if(pos == null)
        timeline.el.scrollLeft = timeline.el.scrollWidth;

    /**
     * Creates the note for the timeline with all the necessary methods
     * @param {Object} noteData As MUSIC_NOTES and boolean if it's dotted
     */
    function createTimelineNote(noteData){
        console.log('creating note');
        console.log(noteData);

        // Creating graphics
        let note = document.createElement("div");
        note.classList.add("item-box");

        // If dotted, add styling
        if(noteData.dotted) note.classList.add("dotted");
        
        // Setup image
        let imgNote = document.createElement("img");
        imgNote.src = noteData.note.img;
        imgNote.classList.add("item");

        // Action area
        let insertActionArea = document.createElement("div");
        insertActionArea.classList.add("insert-action");
        
        note.appendChild(insertActionArea);
        note.appendChild(imgNote);

        // Styling, when the cursor is over the insert action area but not over the note, change the cursor
        insertActionArea.addEventListener("mouseover", () => {
            note.classList.add("between");
        });
        insertActionArea.addEventListener("mouseout", () => {
            note.classList.remove("between");
        });


        return {
            noteEl: note,                    // Node element
            insertTrigger: insertActionArea, // Clicking on this area should insert a note
            deleteTrigger: imgNote           // Clicking on the note icon should delete a note
        };
    }

    function createTimelineLength(current) {
        if (current.dotted) {
            return current.note.duration.dotted();
        } else {
            return current.note.duration;
        }
    }
}

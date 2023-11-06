// Note types
const NOTE_TYPE = {
    NOTE: "note",
    REST: "rest"
}

// Used in the VexFlow notation
const LENGTHS = {
    whole: "w",
    half: "h",
    quarter: "q",
    eighth: "8",
    sixteenth: "16"
}

// Define the existing notes
const MUSIC_NOTES = {
    whole : {
        name: "whole",
        technicalName: "semibreve",
        duraction: LENGTHS.whole,
        type: NOTE_TYPE.NOTE,
        img: "img/note/whole.svg"
    },
    half : {
        name: "half",
        technicalName: "minim",
        duraction: LENGTHS.half,
        type: NOTE_TYPE.NOTE,
        img: "img/note/half.svg"
    },
    quarter : {
        name: "quarter",
        technicalName: "crotchet",
        duraction: LENGTHS.quarter,
        type: NOTE_TYPE.NOTE,
        img: "img/note/quarter.svg"
    },
    eighth : {
        name: "eighth",
        technicalName: "quaver",
        duraction: LENGTHS.eighth,
        type: NOTE_TYPE.NOTE,
        img: "img/note/eighth.svg"
    },
    sixteenth : {
        name: "sixteenth",
        technicalName: "semiquaver",
        duraction: LENGTHS.sixteenth,
        type: NOTE_TYPE.NOTE,
        img: "img/note/sixteenth.svg"
    },
    restWhole : {
        name: "restWhole",
        technicalName: "restWhole",
        duraction: LENGTHS.whole,
        type: NOTE_TYPE.REST,
        img: "img/rest/whole.svg"
    },
    restHalf : {
        name: "restHalf",
        technicalName: "restHalf",
        duraction: LENGTHS.half,
        type: NOTE_TYPE.REST,
        img: "img/rest/half.svg"
    },
    restQuarter : {
        name: "restQuarter",
        technicalName: "restQuarter",
        duraction: LENGTHS.quarter,
        type: NOTE_TYPE.REST,
        img: "img/rest/quarter.svg"
    },
    restEighth : {
        name: "restEighth",
        technicalName: "restEighth",
        duraction: LENGTHS.eighth,
        type: NOTE_TYPE.REST,
        img: "img/rest/eighth.svg"
    },
    restSixteenth : {
        name: "restSixteenth",
        technicalName: "restSixteenth",
        duraction: LENGTHS.sixteenth,
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


// Keeping track of the notes added. For now I'm just passing the element but should be properly updated with
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
    },

    // Remove a note from the timeline
    remove: function(note){
        let index = this.editor.indexOf(note);
        if(index > -1){
            this.editor.splice(index, 1);
        }
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

    // TODO: Add the stuff that you think is relevent to the note!
    // This will be put in the timeline object
    let newNote = {
        noteEl : noteRaw.noteEl,
        noteData: null
    };

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

    /**
     * Creates the note for the timeline with all the necessary methods
     * @param {Object} noteData The note data (the length and if it's dotted, maybe change in future?)
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
}

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
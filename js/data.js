// Note types
const NOTE_TYPE = {
    NOTE: "note",
    REST: "rest"
}

const NOTE_DESIGN = {
    ICON: "",
    TIMELINE: "timeline/"
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
        for (let index = 0 ; index < lens.length ; index++) {
            const len = lens[index]
            if (len != null) {
                bar_pos = lengthPlus(bar_pos, len.length);
                out.push({
                    length: len,
                    source: note,
                    hasNext: index < lens.length - 1,
                })
            } else {
                bar_pos = [0, 1];
                out.push(null);
            }
        }
    }
    return out;
}

function draw_bars(elements) {
    return elements.map((element) => {
        if (element == null) {
            return "|";
        } else {
            const note = element.source.noteType == NOTE_TYPE.NOTE ? "B" : "z";
            const [num, den] = element.length.length;

            const appendix = element.hasNext ? "-" : "";
            return note + num + "/" + den + appendix;
        }
    }).join("");
}

function render() {
    var old_render = document.getElementById("renderoutput");
    old_render.innerHTML = "";
    var cursorControl = {}
    var synthControl = new ABCJS.synth.SynthController();
    // FIXME when there's an audio playing it will remain in some way, we may want to delete the node and create it again (maybe as the child of another node)
    synthControl.load("#audiooutput",
		      cursorControl,
		      {
			  displayLoop: true,
			  displayRestart: true,
			  displayPlay: true,
			  displayProgress: false,
			  // displayWarp: true
		      }
		     );
    var audioParams = { chordsOff: true };
    
    const notes = fit_notes(timeline.editor, [0, 1], timeline.timeSignature);

    const timeString = timeline.timeSignature[0] + "/" + timeline.timeSignature[1];

    var selection_instrument = document.getElementById('instrumentinput');
    var selection_song = document.getElementById('songinput');
    const voice_perc = "V:perc stem=up clef=perc stafflines=1 middle=B\n";
    const voice_melody = selection_song.value == "freestyle" ? "" : "V:melody clef=" + songs[selection_song.value].clef + "\n";
    const score = "%%score (perc) (melody)\n";
    const static_part = "X:1\nQ:"+ timeline.bpm+"\nL:1/1\nM:"+timeString+"\nK:perc\n" + score + voice_perc + voice_melody;
    const noteString = "[V:perc] [I:MIDI= drummap B "+ selection_instrument.value + "] " + draw_bars(notes)  + "|]";
    const other_voice = selection_song.value == 'freestyle' ? "" : "[V:melody]  " + songs[selection_song.value].melody  +"|]";
    var to_render = static_part + other_voice + noteString;
    var visualObj = window.ABCJS.renderAbc("renderoutput", to_render);
    var createSynth = new ABCJS.synth.CreateSynth();
    createSynth.init({
	visualObj: visualObj[0],
	options: {
	    soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/",
	}
    }).then(function () {
	synthControl.setTune(visualObj[0], false, audioParams).then(function () {
	    console.log("Audio successfully loaded.")
	}).catch(function (error) {
	    console.warn("Audio problem:", error);
	});
    }).catch(function (error) {
	console.warn("Audio problem:", error);
    });
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

const LENGTHS_BY_DEN = {1: LENGTHS.whole, 2: LENGTHS.half, 4: LENGTHS.quarter, 8: LENGTHS.eighth, 16: LENGTHS.sixteenth};

// Define the existing notes
const MUSIC_NOTES = {
    whole : {
        name: "whole",
        technicalName: "semibreve",
        duration: LENGTHS.whole,
        type: NOTE_TYPE.NOTE,
        img: "whole.svg",
    },
    half : {
        name: "half",
        technicalName: "minim",
        duration: LENGTHS.half,
        type: NOTE_TYPE.NOTE,
        img: "half.svg",
    },
    quarter : {
        name: "quarter",
        technicalName: "crotchet",
        duration: LENGTHS.quarter,
        type: NOTE_TYPE.NOTE,
        img: "quarter.svg",
    },
    eighth : {
        name: "eighth",
        technicalName: "quaver",
        duration: LENGTHS.eighth,
        type: NOTE_TYPE.NOTE,
        img: "eighth.svg",
    },
    sixteenth : {
        name: "sixteenth",
        technicalName: "semiquaver",
        duration: LENGTHS.sixteenth,
        type: NOTE_TYPE.NOTE,
        img: "sixteenth.svg",
    },
    restWhole : {
        name: "restWhole",
        technicalName: "restWhole",
        duration: LENGTHS.whole,
        type: NOTE_TYPE.REST,
        img: "whole.svg",
    },
    restHalf : {
        name: "restHalf",
        technicalName: "restHalf",
        duration: LENGTHS.half,
        type: NOTE_TYPE.REST,
        img: "half.svg",
    },
    restQuarter : {
        name: "restQuarter",
        technicalName: "restQuarter",
        duration: LENGTHS.quarter,
        type: NOTE_TYPE.REST,
        img: "quarter.svg"
    },
    restEighth : {
        name: "restEighth",
        technicalName: "restEighth",
        duration: LENGTHS.eighth,
        type: NOTE_TYPE.REST,
        img: "eighth.svg"
    },
    restSixteenth : {
        name: "restSixteenth",
        technicalName: "restSixteenth",
        duration: LENGTHS.sixteenth,
        type: NOTE_TYPE.REST,
        img: "sixteenth.svg"
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

const instruments = {
    bass_drum_1: "36",
    acoustic_snare: "38",
    pedal_hi_hat: "44",
    ride_cymbal_1: "51",
    closed_hi_hat: "42",
    crash_cymbal_1: "49",
    chinese_cymbal: "52",
    high_tom: "50",
    hi_mid_tom: "48",
    low_tom: "45",
    low_floor_tom: "41"
};

const available_inst = Object.keys(instruments);
const selection_instrument = document.getElementById('instrumentinput');
available_inst.map( (element, i) => {
    let opt = document.createElement("option");
    opt.value = instruments[element];
    opt.innerHTML = element;
    selection_instrument.append(opt);
});
selection_instrument.addEventListener("change", () => {
    render();
});

const songs = {
    freestyle: {},
    bella_ciao: {
	melody: "[K:C] z3/4 A1/8B1/8 |c1/8 A1/2 E1/8 A1/8B1/8 |c1/8 A1/2 E1/8 A1/8B1/8 |c1/8c1/8 B1/8A1/8 c1/8c1/8 B1/8A1/8 |e1/4 e1/4 e1/4 d1/8e1/8 |f1/8 f1/2 f1/8 e1/8d1/8 |f1/8 e1/2 z1/8 d1/8c1/8 |B1/4 e1/8e1/8 B1/4 c1/4 |A",
	bpm: "140",
	metre: [4,4],
	clef: "treble"
    },
    viva_la_vida: {
	melody: "[K:Ab] [D A,]/8 z/8 [D A,]/8 z/8 [D A,]/8 z/8 [D A,]/8 [E G,]/8 | z/8 [E G,]/8 z/8 [E G,]/8 z/8 [E G,]/8 E/8 [E G,]/8 | [C A,]/8 z/8 [C A,]/8 z/8 [C A,]/8 z/8 [C A,]/8 [C F,]/8|  z/8 [C F,]/8  z/8 [C F,]/8  [C F,]/8 C/8  [C F,]/8 z/8",
	bpm: "128",
	metre: [4,4],
	clef: "treble"
    },
    another_one_bites_the_dust: {
	melody: "[K:C] [I:MIDI=program 34] z3/8F,,/16z3/16F,,/16z3/16F,,/16z/16| z2/8 z/16F,,/16F,,/16z/16 F,,/8^G,,/8 F,,/16^A,,/8z/16| z3/8F,,/16z3/16F,,/16z3/16F,,/16z/16| z2/8 z/16F,,/16F,,/16z/16 F,,/8^G,,/8 F,,/16^A,/8z/16|",
	bpm: "110",
	metre: [4,4],
	clef: "bass"
    },
    pallet_town: {
	melody: "[K:G] [dG,-]/8[cG,-]/8 [BG,]/8[AE,-]/8 [gE,-]/8[eE,]/8 [fF,-]/8[eF,]/8| [dG,]3/8[BA,-]/8 [GA,-]/8[GA,]/8 [AG,-]/8[BG,]/8| [c-E,]3/8[cF,-]2/8[FF,]/8 [GE,-]/8[AE,]/8| [BG,]3/8[cE,-]/16[BE,-]/16 [A-E,]2/8 [AD,]2/8|",
	bpm: "120",
	metre: [4,4],
	clef: "treble"
    },
    tetris: {
	melody: "[K:C] [e'-e-E,,E,,,]/8[e'eB,G,E,]/8 [bBE,,E,,,]/8[c'cB,G,E,]/8 [d'dE,,E,,,]/8[e'B,-G,-E,-]/16[d'B,G,E,]/16 [c'cE,,E,,,]/8[bBB,G,E,]/8| [a-A-A,,A,,,]/8[aACA,E,]/8 [aAA,,A,,,]/8[c'cA,E,C,]/8 [e'-e-A,,A,,,]/8[e'eCA,E,]/8 [d'dA,,A,,,]/8[c'cECA,]/8| [b-B-^G,,G,,,]/8[bBB,G,E,]/8 [bBE,,E,,,]/8[c'cB,G,E,]/8 [d'-d-G,,G,,,]/8[d'dEB,G,E,]/8 [e'-e-E,,E,,,]/8[e'eEB,G,E,]/8| [c'cA,,A,,,]/8[cAECA,E,C,]/8 [aAA,,,A,,,,]/8[ecAECA,E,]/8 [aAA,,A,,,]/8[aecAECA,]/8 [aA,]/16[bB,]/16[c'C]/16[d'D]/16| [e'eEE,]/8[d'-d-A,,F,,D,,]/8 [d'dFD,]/8[f'fA,,F,,D,,]/8 [a'-a-AA,]/8[a'aA,,F,,D,,]/8 [g'gA,A,,]/8[f'fF,F,,]/8| [e'-e-C,C,,]/8[e'-e-CC,]/8 [e'eC,C,,]/8[c'cCC,]/8 [e'-e-C,C,,]/8[e'eCA,E,]/8 [d'dG,,G,,,]/8[c'cCA,E,]/8| [b-B-B,,B,,,]/8[bBB,B,,]/8 [bBB,,B,,,]/8[c'cB,B,,]/8 [d'-d-DD,]/8[d'dE,E,,]/8 [e'-e-B,^G,E,]/8[e'eG,G,,]/8| [c'-c-A,,A,,,]/8[c'cA,E,C,]/8 [a-A-A,,A,,,]/8[aACA,E,]/8 [a-A-A,,A,,,]/8[aAECA,]/8 z/4|",
	bpm: "160",
	metre: [4,4],
	clef: "treble"
    },
    sweet_home_alabama: {
	melody: "[K:G] D,/8D,/8 [D-D,-]/16[D-A,-D,]/16[D-A,-]/16[DA,D,]/16 C,/16z/16C,/8- [D-G,-C,]3/16[D-G,-D,]/16| [D-G,-G,,]/16[DG,]/16G,,/8- [D-G,-G,,]3/16[D-G,-]/16 [D-G,-A,,]/16[DG,-^A,,]/16[G,B,,-]/16[D,B,,]/16 E,/16D,/16A,,/16B,,/16| D,/8D,/8 [D-D,-]/16[D-A,-D,]/16[D-A,-]/16[DA,D,]/16 C,/16z/16C,/8- [D-G,-C,]3/16[D-G,-D,]/16| [DG,G,,]/16z/16G,,/8- [DG,G,,-]3/16G,,/16 B,,/16-[B,,G,,]/16G,,/16C,/16- [C,G,,]/16G,,/16^C,/16G,,/16|",
	bpm: "95",
	metre: [4,4],
	clef: "treble"
    }
};

const available_song = Object.keys(songs);
const selection_song = document.getElementById('songinput');
available_song.map( (element, i) => {
    let opt = document.createElement("option");
    opt.value = element;
    opt.innerHTML = element;
    selection_song.append(opt);
});
selection_song.addEventListener("change", function() {
    if (this.value == "freestyle") {
	bpm_input.disabled = false;
	metrenum_input.disabled = false;
	metreden_input.disabled = false;
    } else {
	bpm_input.value = songs[this.value].bpm;
	timeline.bpm = bpm_input.value;
	bpm_input.disabled = true;

	timeline.timeSignature[0] = songs[this.value].metre[0];
	timeline.timeSignature[1] = songs[this.value].metre[1];
	metrenum_input.value = timeline.timeSignature[0].toString();
	metreden_input.value = timeline.timeSignature[1].toString();
	metrenum_input.disabled = true;
	metreden_input.disabled = true;
    }

    render();
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
        noteImg.src = "img/" + note.type + "/" + NOTE_DESIGN.ICON + note.img;
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

            // Set the length value
            let timing = document.getElementById("timing");
            let len = timeline.getCurrentSymbolLength();
            timing.innerHTML = len[0] + "/" + len[1];

            // If note doesn't have dotted, disable the dotter checkbox when selected
            if(!note.duration.dotted){
                dotter.checked = false;
                dotter.parentElement.classList.add("disabled");
            } else {
                dotter.parentElement.classList.remove("disabled");
            }
        });

        // If not doesn't have dotter, disable when dotter is checked
        if(!note.duration.dotted){
            dotter.addEventListener("change", function(){
                if(dotter.checked){
                    box.classList.add("disabled");
                } else {
                    box.classList.remove("disabled");
                }
            });
        }

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
    },

    // Get the current note lenght
    getCurrentSymbolLength: function(){
        if(this.currentNote.dotted){
            return this.currentNote.note.duration.dotted().length;
        } else {
            return this.currentNote.note.duration.length;
        }
    },

    timeSignature: [4, 4],
    bpm: 80,
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
        noteType: timeline.currentNote.note.type,
        length: createTimelineLength(timeline.currentNote),
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
    
    // Scroll timeline to the end
    if(pos == null)
        timeline.el.scrollLeft = timeline.el.scrollWidth;

    /**
     * Creates the note for the timeline with all the necessary methods
     * @param {Object} noteData As MUSIC_NOTES and boolean if it's dotted
     */
    function createTimelineNote(noteData){
        // console.log('creating note');
        // console.log(noteData);

        // Creating graphics
        let note = document.createElement("div");
        note.classList.add("item-box");

        // If dotted, add styling
        if(noteData.dotted) note.classList.add("dotted");
        
        // Setup image
        let imgNote = document.createElement("img");
        imgNote.src = "img/" + noteData.note.type + "/" + NOTE_DESIGN.TIMELINE + noteData.note.img;
        imgNote.classList.add("item");

        if(noteData.note == MUSIC_NOTES.restWhole || noteData.note == MUSIC_NOTES.restHalf){
            imgNote.classList.add("noshadow");
        }

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

// Setup symbol toolbox tabs
const notesTab = document.getElementById("notesTab");
const restsTab = document.getElementById("restsTab");

notesTab.addEventListener("click", () => {
    notesTab.classList.add("selected");
    restsTab.classList.remove("selected");

    document.getElementById("notes").classList.remove("hidden");
    document.getElementById("rests").classList.add("hidden");
});

restsTab.addEventListener("click", () => {
    restsTab.classList.add("selected");
    notesTab.classList.remove("selected");

    document.getElementById("rests").classList.remove("hidden");
    document.getElementById("notes").classList.add("hidden");
});

// Dotted symbol
const dotter = document.getElementById("dotter"); //checkbox
dotter.addEventListener("click", () => {
    timeline.currentNote.dotted = dotter.checked;

    // Update all the notes in the selector
    let notesBox = document.getElementById("notes");
    for(let i = 0; i < notesBox.children.length; i++){
        notesBox.children[i].classList.toggle("dotted");
    }

    // Same for rests
    let restsBox = document.getElementById("rests");
    for(let i = 0; i < restsBox.children.length; i++){
        restsBox.children[i].classList.toggle("dotted");
    }

    // Set the new length value
    let timing = document.getElementById("timing");
    let len = timeline.getCurrentSymbolLength();
    timing.innerHTML = len[0] + "/" + len[1];

});

// BPM and metre
const bpm_input = document.getElementById("bpminput");
bpm_input.addEventListener("change", () => {
    timeline.bpm = bpm_input.value;
    render();
});

const metrenum_input = document.getElementById("metrenuminput");
metrenum_input.addEventListener("change", () => {
    if (metrenum_input.value < metrenum_input.min) {
        const result = document.getElementById('renderoutput')
        result.innerHTML = "The metre elements should be 1 or greater";
        return;
    }
    timeline.timeSignature[0] = Number(metrenum_input.value);
    render();
});

const metreden_input = document.getElementById("metredeninput");
metreden_input.addEventListener("change", () => {
    if (metreden_input.value < metreden_input.min) {
        const result = document.getElementById('renderoutput');
        result.innerHTML = "The metre elements should be 1 or greater";
        return;
    }
    timeline.timeSignature[1] = Number(metreden_input.value);
    render();
});


// Create the note selector
createNoteSelector();

// Init initially to see player buttons
render();
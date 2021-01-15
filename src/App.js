import "./App.css";
import "@tensorflow/tfjs-backend-cpu";
import { useEffect, useRef, useState } from "react";
// Howler.js
import { Howl } from "howler";
// Mobilenet & KNNClassifier
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
// Source sound:
import sourceSound from "./assets/warning_sound.mp3";


var sound = new Howl({
  src: [sourceSound],
});

// Labels for training:
const UNTOUCH_LABEL = "untouch";
const TOUCHED_LABEL = "touched";
const TRAINING_TIME = 50;
const MATCHING_RATE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const model = useRef();
  const playSound = useRef(true);
  const [touched, setTouched] = useState(false);
  const init = async () => {
    // CAMERA==================================
    let loadCamera = document.getElementById("loading");
    console.log("Setting up the camera...");
    loadCamera.textContent = "Setting up camera, please wait...";
    await setupCamera();

    console.log("Set up camera successfully");
    // LIBRARIES===============================
    console.log("Loading the libraries...");
    loadCamera.textContent = "Loading necessary libraries, please wait..."
    // Load the ImageNet database:
    model.current = await mobilenet.load();
    // Create the classifier.
    classifier.current = knnClassifier.create();
    console.log("Load libraries successfully");
    loadCamera.textContent = "Load libraries successfully";
  };

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", resolve);
          },
          (error) => reject(error)
        );
      } else {
        reject();
      }
    });
  };
  const train_process = async (label) => {
    let process = document.getElementById("process");
    console.log(`[${label}]`);
    for (let i = 0; i < TRAINING_TIME; ++i) {
      console.log(`Training ${parseInt(((i + 1) / TRAINING_TIME) * 100)}%...`);
      let percent = `${parseInt(((i + 1) / TRAINING_TIME) * 100)}%...`;
      process.textContent = "Traning for: " + label + " " + percent;
      await train(label);
    }

    if (label === "untouch") {
      process.textContent = "Hit the TOUCHED button.";
    } else if (label === "touched") {
      process.textContent = "Hit the TEST button.";
    } else {
      process.textContent = "";
    }
  };

  const train = (label) => {
    return new Promise(async (resolve) => {
      /* DOCs
        model.infer(
        img: tf.Tensor3D | ImageData | HTMLImageElement |
        HTMLCanvasElement | HTMLVideoElement,
        embedding = false
        )


        classifier.addExample(
        example: tf.Tensor,
        label: number|string
        ): void;
        * param1 - example: An example to add to the dataset, usually an activation from another model.
        * param2 - label: The label (class name) of the example.


      */

      const embedding = model.current.infer(video.current, true);

      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };
  const run = async () => {
    const embedding = model.current.infer(video.current, true);
    /*  Return an object where:
      * label: the label (class name) with the most confidence.
      * classIndex: the 0-based index of the class (for backwards compatibility).
      * confidences: maps each label to their confidence score.
      => {
          label: string,
          classIndex: number,
          confidences: {
            [classId: number]: number
                }

          }
    */
    const result = await classifier.current.predictClass(embedding);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > MATCHING_RATE
    ) {
      console.log("Touched");
      if(playSound.current) {
          sound.play();
          playSound.current = false;
      }
      
      setTouched(true);
    } else {
      console.log("Untouch");
      setTouched(false);
    }

    /* Test 5 lần/ 1 giây
             => 1 lần -> 0.2 giây -> 200 mili giây 
          */
    await sleep(200);
    run();
  };

  const sleep = (milliSecond = 0) => {
    return new Promise((resolve) => setTimeout(resolve, milliSecond));
  };
  useEffect(() => {
    sound.on("end", function () {
      playSound.current = true;
    });

    init();
    // Clean up
    return () => {};
  }, []);

  return (
    <div className={`app ${touched ? "touched" : ""}`}>
      <div className = "heading">
        <h1 className="title">Warning Touch Your Face</h1>
        <p className = "description">AI Project 2021</p>
        <p id = "loading"></p>
      </div>
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button className="btn" onClick={() => train_process(UNTOUCH_LABEL)}>
          UNTOUCH
        </button>
        <button className="btn" onClick={() => train_process(TOUCHED_LABEL)}>
          TOUCHED
        </button>
        <button className="btn" onClick={() => run()}>
          TEST
        </button>
      </div>
      <div className="info">
        <p id="process">Do not touch your face and hit the UNTOUCH button.</p>
      </div>
    </div>
  );
}

export default App;

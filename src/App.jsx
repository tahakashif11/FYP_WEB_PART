import React, { useRef, useState, useEffect } from 'react';
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";
import ProgressBar from 'react-bootstrap/ProgressBar';
import math from 'math';
import './Progress.css';

const App = () => {
  const [activeScreen, setActiveScreen] = useState('1st');

  const changeScreen = (screen) => {
    setActiveScreen(screen);
  };

  return (
    <div>
      <button onClick={() => changeScreen('1st')}>Pushup</button>
      <button onClick={() => changeScreen('2nd')}>PikePushup</button>
      <button onClick={() => changeScreen('3rd')}>Plank</button>

      {activeScreen === '1st' && <FirstScreen />}
      {activeScreen === '2nd' && <SecondScreen />}
      {activeScreen === '3rd' && <ThirdScreen />}
    </div>
  );
};

const FirstScreen = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [pushupCount, setPushupCount] = useState(0);
  //const [backAngle, setBackAngle] = useState(0);
  const [isCooldown, setIsCooldown] = useState(false);
  const [state, setState] = useState("")
  const [noseHeight, setNoseHeight] = useState(0)
  const [progress, setProgress] = useState(0);

  const backAngle = useRef(null)
  const backAngle2 = useRef(null)
  const shinAngle = useRef(null)

  const nosy = useRef(0)
  const leftYDist = useRef(null);
  const rightYDist = useRef(null);
  const prevLeftYDist = useRef(null);
  const prevRightYDist = useRef(null);


  useEffect(() => {
    const runPosenet = async () => {
      const net = await posenet.load({
        architecture: "ResNet50",
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
        quantBytes: 2,
      });

      const detect = async () => {
        if (
          typeof webcamRef.current !== "undefined" &&
          webcamRef.current !== null &&
          webcamRef.current.video.readyState === 4
        ) {
          const video = webcamRef.current.video;
          const videoWidth = webcamRef.current.video.videoWidth;
          const videoHeight = webcamRef.current.video.videoHeight;

          webcamRef.current.video.width = videoWidth;
          webcamRef.current.video.height = videoHeight;

          const pose = await net.estimateSinglePose(video);
          const leftShoulder = pose.keypoints[5];
          const rightShoulder = pose.keypoints[6];
          const leftHip = pose.keypoints[11];
          const rightHip = pose.keypoints[12];
          const leftKnee = pose.keypoints[13]
          const leftAnkle = pose.keypoints[15]
          const nose = pose.keypoints[0];
          nosy.current = (nose.position.y)
          const legAngle = math.atan2(
            leftKnee.position.y - leftAnkle.position.y,
            leftKnee.position.x - leftAnkle.position.x
          );
          const legAngleDeg = (legAngle * 180) / math.PI;


          // if (nosy.current >= 300) {

          // } 
          // else
          //  {
          //   setProgress(0);
          //      }
          const shoulderHipAngle = math.atan2(
            leftShoulder.position.y - leftHip.position.y,
            leftShoulder.position.x - leftHip.position.x
          );
          const shoulderHipAngleDeg1 = (shoulderHipAngle * 180) / math.PI;

          const shoulderHipAngle2 = math.atan2(
            rightShoulder.position.y - rightHip.position.y,
            rightShoulder.position.x - rightHip.position.x
          );

          const shoulderHipAngleDeg2 = (shoulderHipAngle2 * 180) / math.PI;

          backAngle.current = Math.abs(shoulderHipAngleDeg1)
          backAngle2.current = Math.abs(shoulderHipAngleDeg2)
          shinAngle.current = Math.abs(legAngleDeg)
          // setBackAngle(Math.abs(shoulderHipAngleDeg));

          rightYDist.current = jointYDistEvaluate(pose, 5, 7);
          leftYDist.current = jointYDistEvaluate(pose, 6, 8);

          if (rightYDist.current != null) {
            if (
              pushUpCountCheckRule(
                rightYDist.current,
                prevRightYDist.current,
                videoHeight
              ) &&
              !isCooldown
            ) {
              setIsCooldown(true);
              setTimeout(() => {
                setIsCooldown(false);
              }, 5000);
              setPushupCount((count) => count + 1);
            }
            prevRightYDist.current = rightYDist.current;
          }

          drawCanvas(pose, videoWidth, videoHeight, canvasRef);
        }
      };

      const intervalId = setInterval(detect, 500);
      return () => clearInterval(intervalId);
    };

    const jointYDistEvaluate = (pose, joint1, joint2) => {
      const backThreshold = 160
      console.log("Back Angle: " + backAngle.current)
      console.log("Current Y: " + rightYDist.current)
      console.log("shinAngle: " + shinAngle.current)
      console.log("Nose height: " + nosy.current)
      if (

        (backAngle.current >= backThreshold || backAngle2.current <= 20) && //shinAngle.current<160 &&
        nosy.current >= 300 && //backAngle<180 &&
        pose.keypoints[joint1].score >= 0.3 &&
        pose.keypoints[joint2].score >= 0.3
      ) {
        const maxNoseHeight = 400; // Define the maximum nose height for full progress
        const newProgress = (nosy.current) / (maxNoseHeight) * 100;
        setProgress(parseInt(newProgress));
        console.log("Angle criteria achieved! ")
        setState("Posture Ok!")
        return math.abs(
          pose.keypoints[joint1].position.y - pose.keypoints[joint2].position.y
        );
      }
      if (nosy.current < 300 && (backAngle.current >= 85 && backAngle.current < 170) || (backAngle2.current <= 40 && backAngle2.current > 20) && //backAngle<180 &&
        pose.keypoints[joint1].score >= 0.3 &&
        pose.keypoints[joint2].score >= 0.3) {
        setProgress(0)
        setState("Move Downwards!")
      }

      return null;
    };

    const pushUpCountCheckRule = (
      currentYDist,
      prevYDist,
      videoHeight
    ) => {
      const downHeightTolerance = 20;
      if (
        currentYDist <= downHeightTolerance &&
        prevYDist > downHeightTolerance
      ) {
        return true;
      }
      return false;
    };

    const drawCanvas = (pose, videoWidth, videoHeight, canvas) => {
      const ctx = canvas.current.getContext("2d");
      canvas.current.width = videoWidth;
      canvas.current.height = videoHeight;

      drawKeypoints(pose.keypoints, 0.4, ctx);
      drawSkeleton(pose.keypoints, 0.4, ctx);
    };

    runPosenet();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            color: "#fff",
            fontSize: 30,
            fontFamily: "cursive",
            fontWeight: "bold",
            textShadow: "2px 2px #000",
          }}
        >
          <ProgressBar className="custom-progress-bar" now={progress} label={`${(progress)}%`} />
          <p style={{ color: "goldenrod" }}> {state}</p>

          <p>Pushups: {pushupCount} </p>
        </div>
      </header>
    </div>
  );
}

const SecondScreen = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [pikeCount, setPikeCount] = useState(0);
  //const [backAngle, setBackAngle] = useState(0);
  const [isCooldown, setIsCooldown] = useState(false);
  const [state, setState] = useState("")
  const [noseHeight, setNoseHeight] = useState(0)
  const [progress, setProgress] = useState(0);

  const backAngle = useRef(null)
  const backAngle2 = useRef(null)
  const shinAngle = useRef(null)
  const nosy = useRef(0)
  const leftYDist = useRef(null);
  const rightYDist = useRef(null);
  const prevLeftYDist = useRef(null);
  const prevRightYDist = useRef(null);

  useEffect(() => {
    const runPosenet = async () => {
      const net = await posenet.load({
        architecture: "ResNet50",
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
        quantBytes: 2,
      });

      const detect = async () => {
        if (
          typeof webcamRef.current !== "undefined" &&
          webcamRef.current !== null &&
          webcamRef.current.video.readyState === 4
        ) {
          const video = webcamRef.current.video;
          const videoWidth = webcamRef.current.video.videoWidth;
          const videoHeight = webcamRef.current.video.videoHeight;

          webcamRef.current.video.width = videoWidth;
          webcamRef.current.video.height = videoHeight;

          const pose = await net.estimateSinglePose(video);
          const leftShoulder = pose.keypoints[5];
          const rightShoulder = pose.keypoints[6];
          const leftHip = pose.keypoints[11];
          const rightHip = pose.keypoints[12];
          const nose = pose.keypoints[0];
          const leftKnee = pose.keypoints[13]
          const leftAnkle = pose.keypoints[15]

          nosy.current = (nose.position.y)

          const legAngle = math.atan2(
            leftKnee.position.y - leftAnkle.position.y,
            leftKnee.position.x - leftAnkle.position.x
          );
          const legAngleDeg = (legAngle * 180) / math.PI;



          const shoulderHipAngle = math.atan2(
            leftShoulder.position.y - leftHip.position.y,
            leftShoulder.position.x - leftHip.position.x
          );
          const shoulderHipAngleDeg1 = (shoulderHipAngle * 180) / math.PI;

          const shoulderHipAngle2 = math.atan2(
            rightShoulder.position.y - rightHip.position.y,
            rightShoulder.position.x - rightHip.position.x
          );

          const shoulderHipAngleDeg2 = (shoulderHipAngle2 * 180) / math.PI;

          backAngle.current = Math.abs(shoulderHipAngleDeg1)
          backAngle2.current = Math.abs(shoulderHipAngleDeg2)
          shinAngle.current = Math.abs(legAngleDeg)

          // setBackAngle(Math.abs(shoulderHipAngleDeg));

          rightYDist.current = jointYDistEvaluate(pose, 5, 7);
          leftYDist.current = jointYDistEvaluate(pose, 6, 8);

          if (rightYDist.current != null) {

            if (
              pikeCountCheckRule(
                rightYDist.current,
                prevRightYDist.current,
                videoHeight
              ) &&
              !isCooldown
            ) {

              setIsCooldown(true);
              setTimeout(() => {
                setIsCooldown(false);
              }, 5000);
              setPikeCount((count) => count + 1);
            }
            prevRightYDist.current = rightYDist.current;
          }

          drawCanvas(pose, videoWidth, videoHeight, canvasRef);
        }
      };

      const intervalId = setInterval(detect, 500);
      return () => clearInterval(intervalId);
    };

    const jointYDistEvaluate = (pose, joint1, joint2) => {

      console.log("Back Angle: " + backAngle.current)
      console.log("CurrentY: " + rightYDist.current)
      console.log("Nose height: " + nosy.current)
      if (

        (backAngle.current >= 130 && backAngle.current < 150) && nosy.current >= 300 && //shinAngle.current<142 && //backAngle<180 &&
        pose.keypoints[joint1].score >= 0.3 &&
        pose.keypoints[joint2].score >= 0.3
      ) {




        if (nosy.current >= 300) {
          const maxNoseHeight = 420; // Define the maximum nose height for full progress
          const newProgress = (nosy.current) / (maxNoseHeight) * 100;
          setProgress(parseInt(newProgress));
        }



        console.log("Angle criteria achieved! ")
        setState("Posture Ok!")
        return math.abs(
          pose.keypoints[joint1].position.y - pose.keypoints[joint2].position.y
        );
      }
      if (nosy.current < 300 && (backAngle.current >= 85 && backAngle.current < 130) && //|| (backAngle2.current<= 40 &&backAngle2.current> 20)&& //backAngle<180 &&
        pose.keypoints[joint1].score >= 0.3 &&
        pose.keypoints[joint2].score >= 0.3) {// setProgress(0);
        setState("Move Downwards!")
        setProgress(0);
      }

      return null;
    };

    const pikeCountCheckRule = (
      currentYDist,
      prevYDist,
      videoHeight
    ) => {
      const downHeightTolerance = 50;
      if (
        currentYDist <= downHeightTolerance &&
        prevYDist > downHeightTolerance
      ) {
        return true;
      }
      return false;
    };

    const drawCanvas = (pose, videoWidth, videoHeight, canvas) => {
      const ctx = canvas.current.getContext("2d");
      canvas.current.width = videoWidth;
      canvas.current.height = videoHeight;

      drawKeypoints(pose.keypoints, 0.4, ctx);
      drawSkeleton(pose.keypoints, 0.4, ctx);
    };

    runPosenet();
  }, []);


  return (

    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            color: "#fff",
            fontSize: 30,
            fontFamily: "cursive",
            fontWeight: "bold",
            textShadow: "2px 2px #000",
          }}
        >
          <ProgressBar className="custom-progress-bar" now={progress} label={`${(progress)}%`} />

          <p style={{ color: "goldenrod" }} >{state}</p>

          <p>{pikeCount} </p>
        </div>

      </header>
    </div>
  );

}


const ThirdScreen = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("");
  const [noseHeight, setNoseHeight] = useState(0);


  const backAngle = useRef(null);
  const backAngle2 = useRef(null);
  const shinAngle = useRef(null);
  const armAngle = useRef(null)

  const nosy = useRef(0);
  const leftYDist = useRef(null);
  const rightYDist = useRef(null);


  useEffect(() => {
    const runPosenet = async () => {
      const net = await posenet.load({
        architecture: "ResNet50",
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
        quantBytes: 2,
      });

      const detect = async () => {
        if (
          typeof webcamRef.current !== "undefined" &&
          webcamRef.current !== null &&
          webcamRef.current.video.readyState === 4
        ) {
          const video = webcamRef.current.video;
          const videoWidth = webcamRef.current.video.videoWidth;
          const videoHeight = webcamRef.current.video.videoHeight;

          webcamRef.current.video.width = videoWidth;
          webcamRef.current.video.height = videoHeight;

          const pose = await net.estimateSinglePose(video);
          const leftShoulder = pose.keypoints[5];
          const rightShoulder = pose.keypoints[6];
          const leftWrist = pose.keypoints[9];
          const leftHip = pose.keypoints[11];
          const rightHip = pose.keypoints[12];
          const leftKnee = pose.keypoints[13];
          const leftAnkle = pose.keypoints[15];
          const nose = pose.keypoints[0];
          nosy.current = nose.position.y;

          const wristShoulderAngle = Math.atan2(
            leftWrist.position.y - leftShoulder.position.y,
            leftWrist.position.x - leftShoulder.position.x
          );
          const wristShoulderAngleDeg = (wristShoulderAngle * 180) / Math.PI;

          const legAngle = Math.atan2(
            leftKnee.position.y - leftAnkle.position.y,
            leftKnee.position.x - leftAnkle.position.x
          );
          const legAngleDeg = (legAngle * 180) / Math.PI;



          const shoulderHipAngle = Math.atan2(
            leftShoulder.position.y - leftHip.position.y,
            leftShoulder.position.x - leftHip.position.x
          );
          const shoulderHipAngleDeg1 = (shoulderHipAngle * 180) / Math.PI;

          const shoulderHipAngle2 = Math.atan2(
            rightShoulder.position.y - rightHip.position.y,
            rightShoulder.position.x - rightHip.position.x
          );

          const shoulderHipAngleDeg2 = (shoulderHipAngle2 * 180) / Math.PI;

          backAngle.current = Math.abs(shoulderHipAngleDeg1);
          backAngle2.current = Math.abs(shoulderHipAngleDeg2);
          shinAngle.current = Math.abs(legAngleDeg);
          armAngle.current = Math.abs(wristShoulderAngleDeg);

          rightYDist.current = jointYDistEvaluate(pose, 5, 7);
          leftYDist.current = jointYDistEvaluate(pose, 6, 8);

          if (rightYDist.current) {
            setState("Correct Posture!")
            // if (
            //   plankPostureCheckRule(
            //     backAngle.current,
            //     backAngle2.current,
            //     pose.keypoints[0].score,

            //   )
            // ) {

            //   if (!isPlankActive) {
            //     setIsPlankActive(true);
            //     setPlankTime(0);
            //     startPlankTimer();
            //   }
            //  else {

            //   if (isPlankActive) {
            //     setIsPlankActive(false);
            //     stopPlankTimer();
            //   }
            // }


          }
          else setState("Incorrect Posture!")
          drawCanvas(pose, videoWidth, videoHeight, canvasRef);
        }
      };

      const intervalId = setInterval(detect, 500);
      return () => clearInterval(intervalId);
    };

    const jointYDistEvaluate = (pose, joint1, joint2) => {
      const backThreshold = 160;
      console.log("Arm angle" + parseInt(armAngle.current))
      console.log("Shin angle " + parseInt(shinAngle.current))
      if (
        backAngle.current >= backThreshold && armAngle.current >= 105 && nosy.current >= 250 &&// shinAngle>=150 &&
        pose.keypoints[joint1].score >= 0.3 &&
        pose.keypoints[joint2].score >= 0.3
      ) {
        return true
      }

      return false;
    };



    const drawCanvas = (pose, videoWidth, videoHeight, canvas) => {
      const ctx = canvas.current.getContext("2d");
      canvas.current.width = videoWidth;
      canvas.current.height = videoHeight;

      drawKeypoints(pose.keypoints, 0.4, ctx);
      drawSkeleton(pose.keypoints, 0.4, ctx);
    };

    // const startPlankTimer = () => {
    //   let intervalId = setInterval(() => {
    //     setPlankTime((time) => time + 1);
    //   }, 1000);
    //   setIsCooldown(true);
    //   setTimeout(() => {
    //     clearInterval(intervalId);
    //     setIsCooldown(false);
    //   }, 5000);
    // };

    // const stopPlankTimer = () => {
    //   setPlankTime(0);
    // };

    runPosenet();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 740,
            height: 480,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            color: "#fff",
            fontSize: 30,
            fontFamily: "sans-serif",
            fontWeight: "bold",
            textShadow: "2px 2px #000",
          }}
        >

          <p>{state}</p>

          {/* <p>Plank Time: {plankTime} seconds</p> */}
        </div>
      </header>
    </div>
  );
}


export default App;

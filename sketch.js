// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Webcam Image Classification using a pre-trained customized model and p5.js
This example uses p5 preload function to create the classifier
=== */

// Classifier Variable
let classifier;
// Model URL
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/kRBPEs8t/model.json';

// Video
let video;
let flippedVideo;
// To store the classification
let label = "";

let i2cAccess;
let port;
let adt7410;
let head;
let matched;
let clotheType;

let clotheTypes = ["長袖", "半袖"];

var motor_flag = 0;
//追加DC
let motor = {};
let FORWARD = 1;
let BACK = 2;

let url = "http://192.168.1.97/favicon.ic"
let request;

var huga = 0;
// LoadS the model first
function preload() {
  classifier = ml5.imageClassifier(imageModelURL);
}


async function LED() {
  var gpioAccess = await navigator.requestGPIOAccess(); // GPIO を操作する
  var portled = gpioAccess.ports.get(4); // 4 番ポートを操作する
  var v = 1;

  await portled.export("out"); // ポートを出力モードに設定

  portled.write(v);

}

async function httpinit() {
  request = new XMLHttpRequest();
  head = document.getElementById("head");
  matched = document.getElementById("match");
  
  i2cAccess = await navigator.requestI2CAccess(); // i2cAccessを非同期で取得
  port = i2cAccess.ports.get(1); // I2C I/Fの1番ポートを取得
  
  //追加DC
  motor[0] = await port.open(0x63);
  motor[1] = await port.open(0x64);
  await motor[0].write8(0x00, 0x00);
  await motor[1].write8(0x00, 0x00);

  for (;;) {
    // 無限ループ
    var value = 0;
    request.open('GET', url);
    request.onreadystatechange = function() {
      if (request.readyState != 4) {
        // console.log("debug");
      } else if (request.status != 200) {
        console.log("error:" + request.status);
      } else {
        console.log(request.responseText);
        var obj = JSON.parse(request.responseText);
        value = obj.temp;
        
        if (value < 25) {
          clotheType = clotheTypes[0];
        } else {
          clotheType = clotheTypes[1];
        }
        if (head != null) {
          head.innerHTML = value ? `${value} degree : ${clotheType}` : "Measurement failure";
        }
      }
    }
    request.send(null);
    
    // console.log(value);
    await sleep(1000);
  }

}

async function init() {
  i2cAccess = await navigator.requestI2CAccess(); // i2cAccessを非同期で取得
  port = i2cAccess.ports.get(1); // I2C I/Fの1番ポートを取得
  adt7410 = new ADT7410(port, 0x48); // 取得したポートの0x48アドレスをADT7410ドライバで受信する
  await adt7410.init();
  head = document.getElementById("head");
  matched = document.getElementById("match");


  //追加DC
  motor[0] = await port.open(0x63);
  motor[1] = await port.open(0x64);
  await motor[0].write8(0x00, 0x00);
  await motor[1].write8(0x00, 0x00);



  for (;;) {
    // 無限ループ
    var value = await adt7410.read();
    if (value < 25) {
      clotheType = clotheTypes[0];
    } else {
      clotheType = clotheTypes[1];
    }
    if (head != null) {
      head.innerHTML = value ? `${value} degree : ${clotheType}` : "Measurement failure";
    }
    console.log(value);
    console.log(motor_flag);
    await sleep(2000);
  }
}

function setup() {
  init();
  // httpinit();


  createCanvas(320, 260);
  // Create the video
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  flippedVideo = ml5.flipImage(video)
  // Start classifying
  classifyVideo();
  //追加DC
}

//追加DC

async function controlMotor(num, direction, speed) {
  let value = (speed << 2) + direction;
  await motor[num].write8(0x00, value);
}



function draw() {
  background(0);
  // Draw the video
  image(flippedVideo, 0, 0);

  // Draw the label
  fill(255);
  textSize(16);
  textAlign(CENTER);
  text(label, width / 2, height - 4);
}

// Get a prediction for the current video frame
function classifyVideo() {
  flippedVideo = ml5.flipImage(video)
  classifier.classify(flippedVideo, gotResult);
}



// When we get a result
function gotResult(error, results) {
  // If there is an error
  if (error) {
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
  // console.log(results[0]);
  label = results[0].label;

  if (motor_flag == 0) {
    controlMotor(0, FORWARD, 0x10);
  } else if (motor_flag == 1) {
    controlMotor(0, FORWARD, 0);
  }
  //interval_flag = 0;

  if (label == clotheType) {
    //モーター停止
    //5sよばれなくする
    matched.innerHTML = "一致";
    //追加DC
    var hoge = setInterval(function() {
      console.log(huga);
      huga++;
      //終了条件
      if (huga < 10) {
        clearInterval(hoge);
        console.log("終わり");
        motor_flag == 0;
      }
    }, 500);

    if (huga > 10) {
      motor_flag = 1;
      LED();
    }
  } else if (label != clotheType) {
    matched.innerHTML = "ちがう";
    //追加DC
  }
  //else if(label == clotheType && interval_flag == 1){
  //   matched.innerHTML = "一致";
  //   motor_flag =　1;
  // }

  // Classifiy again!
  classifyVideo();
}

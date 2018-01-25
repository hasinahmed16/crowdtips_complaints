
import React, { Component } from 'react';
import { Follow, Mention } from 'react-twitter-widgets'
import { Line, Circle } from 'rc-progress';

import logo from './logo.svg';
import './App.css';

import SelectStation from './select_station/SelectStation'
import SelectLine from './select_line/SelectLine'
import sleep from 'await-sleep'
import ReactCSSTransitionReplace from 'react-css-transition-replace';
import OtherComplaintBox from './select_complaint/OtherComplaint';
import FeedbackType from './feedback/FeedbackType'
import FeedbackInput from './feedback/FeedbackInput'
import FeedbackDataPoints from './feedback/FeedBackDataPoints'
import FeedbackGif from './feedback/FeedbackGif'
import DataOperations from './controllers/DataOperations'

var $ = require("jquery");
var firebase = require('firebase')

var MobileDetect = require('mobile-detect'),
    md = new MobileDetect(window.navigator.userAgent);


var fieldValues = {
  station_name     : null,
  subway_line    : null,
  complaints : [],
  timestamp      : null,
}

class App extends Component {

  constructor(props){
    super(props)

    this.state = {
      step:1,
      currentComplaintType:null,
      selectedLine:null, GoogleMapsApi:null,
      stationsGroupedByColour: {},
      baseColor:'green'
      
    }

    this.nextStep = this.nextStep.bind(this)
    this.previousStep = this.previousStep.bind(this)
    this.openStep = this.openStep.bind(this)
    this.saveValues = this.saveValues.bind(this)
    this.showStep = this.showStep.bind(this)
    this.setFeedbackType = this.setFeedbackType.bind(this)
    this.submitData = this.submitData.bind(this)
    this.updateLineSelection = this.updateLineSelection.bind(this)
    //this.initFirebase = this.initFirebase.bind(this)
    this.writeData = this.writeData.bind(this)
    this.loadMap = this.loadMap.bind(this)
    this.loadAndGroupStationsByColour = this.loadAndGroupStationsByColour.bind(this)
    this.loadStationToMapByColor = this.loadStationToMapByColor.bind(this)
    this.clearMapContents = this.clearMapContents.bind(this)
    this.updateMapWithLine = this.updateMapWithLine.bind(this)
    this.updateSelectedStation = this.updateSelectedStation.bind(this)
    this.loadSpecificStationToMap = this.loadSpecificStationToMap.bind(this)
    this.populateMapWithAllStations = this.populateMapWithAllStations.bind(this)
    this.writeUserData = this.writeUserData.bind(this)
    this.setBaseColor = this.setBaseColor.bind(this)
    this.resetAll = this.resetAll.bind(this)
    this.setFeedbackReason = this.setFeedbackReason.bind(this)
    this.getImageForStationColor= this.getImageForStationColor.bind(this)
    this.getUserInformation = this.getUserInformation.bind(this)
    this.getMobileOperatingSystem = this.getMobileOperatingSystem.bind(this)
    this.arrayContains = this.arrayContains.bind(this)
    this.ref = null
    this.GMapApi = null
    this.stationsGroupedByColour = {}
    this.stationMarkers=[]


  }

  componentDidMount(){
    //this.initFirebase()
    this.getUserInformation()
    
    this.loadMap()
  }

  getUserInformation(){

      //location and Ip address
        $.getJSON('https://api.ipify.org?format=json', function(data){
            console.log(data.ip);
            var ip = data.ip
            
            $.get("https://freegeoip.net/json/"+String(ip), function(data2){
                
              var data = {
                ip_address: ip,
                location: data2
              }

              this.saveValues({user:data})
            }.bind(this))
        }.bind(this));

        //device type data

        var mobileOS = {
          mobile_os:this.getMobileOperatingSystem()
        }

        var deviceData = {
          md_mobile:md.mobile() || "",
          md_phone:md.phone() || "",
          md_tablet:md.tablet() || "",
          md_agent: md.userAgent() || "",
          md_os: md.os() || "",
          is_iphone: md.is('iphone') || "",
          is_bot: md.is('bot') || "",
          screen_height: window.myScreenHeight || "",
          screen_width: window.myScreenWidth || "",
          browser_height: window.innerHeight || "",
          browser_width: window.innerWidth || "",
          mobile_os:this.getMobileOperatingSystem()
        }

        this.saveValues({device:deviceData})

  }


  getMobileOperatingSystem() {
      var userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
          // Windows Phone must come first because its UA also contains "Android"
        if (/windows phone/i.test(userAgent)) {
            return "Windows Phone";
        }
    
        if (/android/i.test(userAgent)) {
            return "Android";
        }
    
        // iOS detection from: http://stackoverflow.com/a/9039885/177710
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return "iOS";
        }
    
        return "unknown";
  }

  setBaseColor(color){
    this.setState({baseColor:color})
  }

  async loadMap(){
    await sleep(1000)
    var MapApi = window.another;

    this.GMapApi = MapApi
    var myLatlng = {lat:40.748817, lng:-73.985428};

    var mapOptions = {
        zoom: 13,
        center: myLatlng,
        scrollwheel: false, //we disable de scroll over the map, it is a really annoing when you scroll through page
        styles: mapStyle
    }
    this.GoogleApi = MapApi
    //init new map
    this.map = new MapApi.Map(document.getElementById("mapbody"), mapOptions);

    this.setState({map:this.map, GoogleMapsApi: MapApi})

    this.loadAndGroupStationsByColour()

    this.populateMapWithAllStations()

  }

  populateMapWithAllStations(){

    this.clearMapContents()

    var keys = Object.keys(this.state.stationsGroupedByColour)
    var count = 0
    var marker;
    for (var k in this.state.stationsGroupedByColour){
      for (var i = 0; i< this.state.stationsGroupedByColour[k].length; i++){
        var data = this.state.stationsGroupedByColour[k][i]
        this.loadSpecificStationToMap(data, k, count, marker)
        count = count + 1
      }
    }


  }
  arrayContains(needle, arrhaystack)
  {
      return (arrhaystack.indexOf(needle) > -1);
  }
  loadAndGroupStationsByColour(){
    var stationColors = {
      blue:[],
      orange:[],
      light_green:[],
      brown:[],
      light_gray:[],
      dark_gray:[],
      yellow:[],
      red:[],
      green:[],
      purple:[],
      another_blue:[]
    }

    var data = require('./data/subway-stations.json')
    var stationData = data['features']

    for(var i=0; i<stationData.length; i++){
      var line = stationData[i]["properties"]["line"]
      var lineSplit = line.split("-")

      if(/^[a-zA-Z]+$/.test(lineSplit[0])){
        if(this.arrayContains("A", lineSplit) || this.arrayContains("C", lineSplit) || this.arrayContains("E", lineSplit)){
          stationColors["blue"].push(stationData[i])
        }if(this.arrayContains("B", lineSplit) || this.arrayContains("F", lineSplit) || this.arrayContains("D", lineSplit) || this.arrayContains("D", lineSplit)){
            stationColors["orange"].push(stationData[i])
        }if(this.arrayContains("S", lineSplit)){
          stationColors["dark_gray"].push(stationData[i])
        }if(this.arrayContains("N", lineSplit) || this.arrayContains("Q", lineSplit) || this.arrayContains("R", lineSplit) || this.arrayContains("W", lineSplit)){
          stationColors["yellow"].push(stationData[i])
        }if(this.arrayContains("L", lineSplit) ){
          stationColors["light_gray"].push(stationData[i])
        }if(this.arrayContains("J", lineSplit) || this.arrayContains("Z", lineSplit) ){
          stationColors["brown"].push(stationData[i])
        }if(this.arrayContains("G", lineSplit)){
          stationColors["light_green"].push(stationData[i])
        }else{
          stationColors["another_blue"].push(stationData[i])

        }
      }else{
        if(this.arrayContains("1", lineSplit) || this.arrayContains("2", lineSplit) || this.arrayContains("3", lineSplit)){
          stationColors["red"].push(stationData[i])
        } if(this.arrayContains("4", lineSplit) || this.arrayContains("5", lineSplit) || this.arrayContains("6", lineSplit)){
                  stationColors["green"].push(stationData[i])
        }if(this.arrayContains("7", lineSplit) ){
          stationColors["purple"].push(stationData[i])
        }
      }
    }

    this.stationsGroupedByColour = stationColors;
    this.setState({
      stationsGroupedByColour:stationColors
      
    })    
  }


  getImageForStationColor(stationColor){
    var imageUrl = 'http://localhost:3000/station_icons/'

    if(stationColor == "red"){
      imageUrl = imageUrl+"red.png"
    }
    if(stationColor == "blue"){
      imageUrl = imageUrl+"blue.png"
    }
    if(stationColor == "green"){
      imageUrl = imageUrl+"green.png"
    }
    if(stationColor == "light_green"){
      imageUrl = imageUrl+"lightgreen.png"
    }
    if(stationColor == "yellow"){
      imageUrl = imageUrl+"yellow.png"
    }
    if(stationColor == "brown"){
      imageUrl = imageUrl+"brown.png"
    }
    if(stationColor == "purple"){
      imageUrl = imageUrl+"purple.png"
    }
    if(stationColor == "orange"){
      imageUrl = imageUrl+"orange.png"
    }
    if(stationColor == "light_gray"){
      imageUrl = imageUrl+"lightgray.png"
    }
    if(stationColor == "dark_gray"){
      imageUrl = imageUrl+"darkgray.png"
    }

    if(stationColor == "another_blue"){
      imageUrl = imageUrl+"anotherblue.png"
    }

    return imageUrl
  }
  loadStationToMapByColor(stationColor){

    //await(2000)
    var markers = []
    var MapApi = this.GoogleApi
   
    var map = this.map

    var imageUrl = this.getImageForStationColor(stationColor)
    var data = this.state.stationsGroupedByColour[stationColor]

    var image = {
      url: imageUrl,
      // This marker is 20 pixels wide by 32 pixels high.
      size: new MapApi.Size(20, 32),
      // The origin for this image is (0, 0).
      origin: new MapApi.Point(0, 0),
      // The anchor for this image is the base of the flagpole at (0, 32).
      anchor: new MapApi.Point(0, 32)
    };

    var shape = {
      coords: [1, 1, 1, 20, 18, 20, 18, 1],
      type: 'poly'
    };

    var infowindow = new MapApi.InfoWindow();
    var marker, i;

    var data = this.state.stationsGroupedByColour[stationColor]

    for (i = 0; i < data.length; i++) {
      var station = data[i]
      var name = station["properties"]["name"]  
      marker = new MapApi.Marker({
        position: new MapApi.LatLng(station["geometry"]["coordinates"][1], station["geometry"]["coordinates"][0]),
        map: map,
        icon:image
      });

      this.stationMarkers.push({
        name:name,
        line:station["properties"]["line"],
        marker: marker
      })

      MapApi.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
            var content = "<div>"+
                        "<h2>"+ this.stationMarkers[i]["name"]+"</h2>"+
                        "<h4>"+ this.stationMarkers[i]["line"]+ "</h4></div>";
            var selection ={
                name:this.stationMarkers[i]["name"],
                line:this.stationMarkers[i]["line"]
            }
          infowindow.setContent(content);
          infowindow.open(map, marker);
        }.bind(this)
      }.bind(this))(marker, i));

      this.setState({stationMarkers:markers})
    }
  }

  updateMapWithLine(selectedColor){
    this.clearMapContents()
    this.loadAndGroupStationsByColour()
    this.loadStationToMapByColor(selectedColor)
  }

  clearMapContents(){
    // Sets the map on all markers in the array.
    var markers = this.stationMarkers
    var map = this.map
    for (var i = 0; i < this.stationMarkers.length; i++) {
      markers[i]['marker'].setMap(null);
    }
    this.stationMarkers = []

    var myLatlng = {lat:40.748817, lng:-73.985428};

    this.map.panTo(myLatlng)
  }

  writeData(data){
    var newPostKey = DataOperations.getSessionKey()//firebase.database().ref().child('complaints').push().key;
    this.complaintKey = newPostKey;
    var updates = {};

    var completionTime = DataOperations.getFirebaseTimestamp()
    
    updates['/complaints/' + newPostKey + '/user_input/'] = data;
    updates['/complaints/' + newPostKey + '/time_on_site/completed'] = completionTime;

    firebase.database().ref().update(updates);
    
   // alert("Submission Received! Thank you")
  }


  writeUserData(e){
    e.preventDefault()
    var data = {
      // name: this.refs.userName.value || "",
      // email: this.refs.userEmail.value || "",
      suggestion: this.refs.suggestion ||"",
      complaint_key: this.complaintKey || "none"
    }
    var newPostKey = firebase.database().ref().child('subscriptions').push().key;
    var updates = {};
    updates['/subscriptions/' + newPostKey] = data;
    firebase.database().ref().update(updates);
    this.complaintKey = ""
    this.resetAll()
    
  }

  resetAll(){

    console.log("calling reload")
    window.parent.location.reload()
  }

  setFeedbackType(data){
    this.setState({
      currentFeedbackType: data
    })
  }

  setFeedbackReason(data){
    this.setState({
      currentFeedbackReason: data
    })
  }

  saveValues(fields) {
    return function() {

      fieldValues = Object.assign({}, fieldValues, fields)
      console.log(fieldValues)

    }()

  }
  
  nextStep() {
    this.setState({
      step : this.state.step + 1
    })
  }

  openStep(stepNumber){
    this.setState({
      step: stepNumber
    })
  }
  
  previousStep() {
    this.setState({
      step : this.state.step - 1
    })
  }

  updateLineSelection(line, color){
    var col = color
    if (color == "light_green"){
      col = "aquamarine"
    }
    if (color == "light_gray"){
      col = "lightgray"
    }
    if (color == "dark_gray"){
      col = "darkgray"
    }
    this.setState({
      selectedLine: line,
      baseColor:col
    })

    this.updateMapWithLine(color)
  }


  updateSelectedStation(stationData, color){
    var line = stationData["properties"]["line"]
    var lineSplit = line.split("-")

    if(/^[a-zA-Z]+$/.test(lineSplit[0])){
      if(this.arrayContains("A", lineSplit) || this.arrayContains("C", lineSplit) || this.arrayContains("E", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("B", lineSplit) || this.arrayContains("F", lineSplit) || this.arrayContains("D", lineSplit) || this.arrayContains("D", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("S", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      } else if(this.arrayContains("N", lineSplit) || this.arrayContains("Q", lineSplit) || this.arrayContains("R", lineSplit) || this.arrayContains("W", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("L", lineSplit) ){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("J", lineSplit) || this.arrayContains("Z", lineSplit) ){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("G", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else{
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
        
      }
    }else{
      if(this.arrayContains("1", lineSplit) || this.arrayContains("2", lineSplit) || this.arrayContains("3", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("4", lineSplit) || this.arrayContains("5", lineSplit) || this.arrayContains("6", lineSplit)){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }else if(this.arrayContains("7", lineSplit) ){
        this.loadSpecificStationToMap(stationData, this.state.baseColor)
      }
    }
  }

  loadSpecificStationToMap(stationData, lineColor, index=0){

    if(index == 0)
      this.clearMapContents();

    var markers = []
    var MapApi = this.GoogleApi
   
    var map = this.map
    var imageUrl = 'http://localhost:3000/station_icons/'+lineColor+".png"

    var image = {
      url: imageUrl,
      // This marker is 20 pixels wide by 32 pixels high.
      size: new MapApi.Size(20, 32),
      // The origin for this image is (0, 0).
      origin: new MapApi.Point(0, 0),
      // The anchor for this image is the base of the flagpole at (0, 32).
      anchor: new MapApi.Point(0, 32)
    };

    var shape = {
      coords: [1, 1, 1, 20, 18, 20, 18, 1],
      type: 'poly'
    };

    var infowindow = new MapApi.InfoWindow();
    var marker;

      var station = stationData
      var name = station["properties"]["name"]  

      marker = new MapApi.Marker({
        position: new MapApi.LatLng(station["geometry"]["coordinates"][1], station["geometry"]["coordinates"][0]),
        map: map,
        icon:image
      });

      this.stationMarkers.push({
        name:name,
        line:station["properties"]["line"],
        marker: marker
      })
    
    MapApi.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
          var content = "<div>"+
                      "<h2 className='info-window-header'>"+ this.stationMarkers[i]["name"]+"</h2>"+
                      "<h4 className='info-window-body'>"+ this.stationMarkers[i]["line"]+ "</h4></div>";
          var selection ={
              name:this.stationMarkers[i]["name"],
              line:this.stationMarkers[i]["line"]
          }
        infowindow.setContent(content);
        infowindow.open(map, marker);

        //this.props.stationSelection(selection)
      }.bind(this)
    }.bind(this))(marker, index));

    var myLatlng = new MapApi.LatLng(station["geometry"]["coordinates"][1], station["geometry"]["coordinates"][0])
    this.map.setZoom(13);

    this.map.panTo(myLatlng)
    this.setState({stationMarkers:markers})

  }

  submitData(){

    var timeInMs = Date.now();
    var time={
      timestamp: timeInMs
    }
    fieldValues = Object.assign({}, fieldValues, time) 
       
    // WRITE TO FIREBASE
    this.writeData(fieldValues)

    this.setState({
      step : 7
    })

  }

  showStep(){
    switch(this.state.step){
      case 1:
        return (
        <SelectLine setTheme={this.setBaseColor} key="step1" updateLineSelection={this.updateLineSelection} currStep ={this.state.step} fieldValues={fieldValues}
        nextStep={this.nextStep}
        saveValues={this.saveValues} />  
 
        )     
        
      case 2:
        return ( 

        <SelectStation baseColor={this.state.baseColor} updateSelectedStation = {this.updateSelectedStation} key="step2" selectedLine = {this.state.selectedLine} currStep ={this.state.step} fieldValues={fieldValues}
          nextStep={this.nextStep}
          saveValues={this.saveValues} goBack={this.previousStep}/>
        )         
      case 3:
        return (
          <FeedbackType goBack={this.previousStep} baseColor={this.state.baseColor} openStep={this.openStep} key="step3" setFeedbackType={this.setFeedbackType} currStep ={this.state.step} fieldValues={fieldValues}
          nextStep={this.nextStep}
          saveValues={this.saveValues}/> 
        ) 

      case 4:
        return (
          <FeedbackDataPoints openStep={this.openStep} setFeedbackReason={this.setFeedbackReason}goBack={this.previousStep} baseColor={this.state.baseColor} key="step4" complaintType={this.state.currentComplaintType} currStep ={this.state.step} fieldValues={fieldValues}
          nextStep={this.nextStep}
          saveValues={this.saveValues} 
          /> 
        )  

      case 5:
        return(
          <FeedbackInput setTheme={this.setBaseColor} key="step5" updateLineSelection={this.updateLineSelection} currStep ={this.state.step} fieldValues={fieldValues}
            nextStep={this.nextStep}
            saveValues={this.saveValues} submitData={this.submitData} />  
      )  
      case 6:
        return (
          <OtherComplaintBox resetData = {this.resetAll} baseColor={this.state.baseColor} submitData={this.submitData} openStep={this.openStep}key="step6" fieldValues={fieldValues}nextStep={this.nextStep}saveValues={this.saveValues}/>  
      )
      case 8:

        return(
          <div id="contactForm" key="step7">

            <h1 className="contact-form-header">Thank(s) you for your submission!</h1>
            <small className="contact-form-description">Connect with us on social media </small>
            <Follow username="crowdtips_xyz" options={{size:"large"}}/>
            <Mention username="crowdtips_xyz" options={{size:"large"}}/>
            <a href="https://instagram.com/crowdtips">
              <img src="http://www.thesiteshed.com/wp-content/uploads/2016/02/Follow-us-on-Instagram.png" width="100" height="40" className="shares-instagram"/>
            </a>

            <form action="#">
              <textarea placeholder="Any suggestions on how to improve the site.."rows="10" id="complaint-text-area" ref="text"></textarea>
              <button onClick={this.writeUserData}className="formBtn" >Submit </button>
              <button onClick={this.resetAll} style={{backgroundColor:'red'}}id="formBtn">Cancel</button>
            </form>
          </div>
      )

      case 7:
        return(
          <FeedbackGif setTheme={this.setBaseColor} key="step8" openStep={this.openStep} updateLineSelection={this.updateLineSelection} currStep ={this.state.step} fieldValues={fieldValues}
          nextStep={this.nextStep}
          saveValues={this.saveValues} submitData={this.submitData} >

          </FeedbackGif>
        )
    }
  }

  render() {

    var progress = this.state.step / 8 * 100
  
    return(
      <div id="page-container">
        <div id="rightsidebar">
          <Line percent={progress} strokeWidth="4" strokeColor="#31B3F4" />

          <ReactCSSTransitionReplace
            transitionName="carousel-swap"
            transitionEnterTimeout={180}
            transitionLeaveTimeout={91}
          > 
            {this.showStep()}
          </ReactCSSTransitionReplace>
        </div>
        <div id="mapbody">
        </div>
      </div>
    )
  }
}


var mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
]
export default App;

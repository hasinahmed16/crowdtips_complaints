import React, { Component } from 'react';
import './SelectStation.css'

class SelectStation extends Component {
    constructor(props){
        super(props)

        this.state = {
            initialItems: [
              ],
              items: [],
              selectedItems:[]
        }
        this.filterList = this.filterList.bind(this)
        this.saveAndContinue = this.saveAndContinue.bind(this)
        this.selectStationsMatchingLine = this.selectStationsMatchingLine.bind(this)
        this.setInitialitems = this.setInitialitems.bind(this)
    }
    componentWillMount(){
        var line = this.props.selectedLine
        var data = require('../data/subway-stations.json')
        var subwayStations = data['features']
        this.subwayStations = subwayStations

        this.setInitialitems(subwayStations)

        this.selectStationsMatchingLine(line)
        //this.setState({items: this.state.initialItems})
    }

    setInitialitems(data){
        this.setState({
            initialItems: data
        })
    }

    filterList(event){
        var updatedList = this.state.items//this.state.initialItems;
        updatedList = updatedList.filter(function(item){
          return item.properties.name.toLowerCase().search(
            event.target.value.toLowerCase()) !== -1;
        });
        this.setState({selectedItems: updatedList});
      }

    saveAndContinue(e, data, stationData) {
        e.preventDefault()
        console.log(data)
        var out ={
            station_name: data
        }

        this.props.updateSelectedStation(stationData)
        this.props.saveValues(out)
        this.props.nextStep()
    }

    selectStationsMatchingLine(lineSelection){
        //read stations data
       // var data = require('../data/subway-stations.json')
        var subwayStations = this.subwayStations//data['features']
        var toReturn = []
        //loop throug features array
        for(var i=0; i< subwayStations.length; i++){
            var line = subwayStations[i]["properties"]["line"]

            var lineSplit = line.split("-")
            console.log(typeof(lineSplit[0], typeof(lineSelection)))

            if(/^[a-zA-Z]+$/.test(lineSelection)){
                if(lineSplit.indexOf(lineSelection.toUpperCase()) != -1){
                    toReturn.push(subwayStations[i])
                }
            }else{
                if(lineSplit.indexOf(String(lineSelection)) != -1){
                    toReturn.push(subwayStations[i])
                }
            }
        }

        this.setState({
            items: toReturn,
            selectedItems: toReturn
        })
        
    }

    render(){

        var style = {
            width : (this.props.currStep / 4 * 100) + '%'
          }

          var bgColor = {
            backgroundColor: this.props.baseColor,

          }
        return (
            <div id="rightsidebaro">
            
                <div id="header"><h1>MTA Feedback</h1></div>
                <div id="train"><h1>Select a train station</h1></div>  

                <div id="trainlines">
                    <div className="filter-list">
                    <input type="text" placeholder="Search" onChange={this.filterList}/>
                    <List bgStyle={bgColor} saveData={this.saveAndContinue}items={this.state.selectedItems}/>
                    </div>
                </div>
            </div>
          );
    }
}

class List extends Component {

    constructor(){
        super()
        this.guid = this.guid.bind(this)
    }

    guid() {
        function s4() {
          return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
      }

    render(){
        return(
            <ul>
            {
              this.props.items.map(function(item) {
                return <li style={this.props.bgStyle} onClick={(e) => this.props.saveData(e, item.properties.name, item)} key={this.guid()}>{item.properties.name}</li>
              }.bind(this))
             }
            </ul>
          )         
    }
}

export default SelectStation;
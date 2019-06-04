import * as React from 'react';
import { ListGroup } from 'reactstrap';
import ProfileList from './ProfileList';
import '../css/Home.scss';
import { apiBackendUrl } from '../helpers/constants';
import { IProfile } from '../interfaces/IProfile';
import FormModal from './FormModal';
import LoadingSpinner from './LoadingSpinner';

export default class Home extends React.Component<{}> {

  public state = {
    profiles: [] as IProfile[],
    loading: true
  }

  saveProfile = (username: string) => {

    this.setState({ loading: true });

    const requestOptions = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "username": username })
    };

    fetch(apiBackendUrl + "profile/save", requestOptions).then(response => {
      if (!response.ok) {
        response.json().then(function (err) {
          alert(err.message);
        });
        return;
      }

      this.listProfiles();
    });
  }

  removeProfile = (username: string) => {

    if (!window.confirm("Confirm this action?")) {
      return;
    }

    this.setState({ loading: true });

    const requestOptions = {
      method: 'DELETE'
    };

    fetch(apiBackendUrl + "profile/" + username, requestOptions).then(response => {
      if (!response.ok) {
        response.json().then(function (err) {
          alert(err.message);
        });
        return;
      }

      this.listProfiles();
    });
  }

  listProfiles = () => {
    fetch(`${apiBackendUrl}profile/listAll?_t=${new Date().getTime()}`)
      .then(response => response.json())
      .then(profiles => this.setState({ profiles, loading: false }))
      .catch(e => e);
  }

  openWebSocket = () => {
    if ("WebSocket" in window) {

      let protocol = window["location"]["protocol"];
      let address = apiBackendUrl.substring(apiBackendUrl.indexOf(":") + 3);
      address = (((protocol + "").toLowerCase().indexOf("https") === 0) ? "wss://" : "ws://") + address;

      let wsSocket = new WebSocket(address);

      wsSocket.onopen = () => {
        console.log("Websocket connected!");
      };

      wsSocket.onmessage = (event) => {
        try {

          var jsonMessage = JSON.parse(event.data);

          if (jsonMessage.message) {
            if (jsonMessage.message === "new profile" || jsonMessage.message === "removed profile") {
              this.listProfiles();
            }
          }

          console.log(event.data);

        } catch (error) {
          //nothing
        }
      };

      wsSocket.onclose = () => {
        console.log("Websocket closed!");
        // Try to reconnect in 5 second
        setTimeout(this.openWebSocket, 5000);
      };
    }
  }

  componentDidMount() {
    console.log(apiBackendUrl);
    this.listProfiles();
    this.openWebSocket();
    setInterval(() => this.listProfiles(), 5000);
  }

  shouldComponentUpdate(nextProps: any, nextState: any) {
    return JSON.stringify(this.state.profiles) !== JSON.stringify(nextState.profiles) || this.state.loading !== nextState.loading;
  }

  render() {
    const list = this.state.profiles.map((profile) => {
      return <ProfileList
        key={profile._id}
        profile={profile}
        listProfiles={this.listProfiles}
        removeProfile={this.removeProfile} />
    })

    return (
      <div>

        {this.state.loading && <LoadingSpinner />}

        {!this.state.loading && <ListGroup>{list}</ListGroup>}

        {!this.state.loading && <FormModal saveProfile={this.saveProfile} />}

        {!this.state.loading && <div className="text-center">
          <small>
            Developed by <a href="http://ivanvaladares.com" target="_new">Ivan Valadares</a> <br /> 
            Check the <a href="/api-docs" target="_new">API docs</a><br /> 
            Get the source code at <a href="https://github.com/ivanvaladares/instagram-scrapper">github.com/ivanvaladares/instagram-scrapper</a>
          </small>
        </div>}


      </div>);
  }
}

import * as React from 'react';
import { ListGroupItem, Button, Label, Row, Col, Progress } from 'reactstrap';
import '../css/ProfileList.scss';
import ProfileModal from './ProfileModal';
import { FaTrash } from 'react-icons/fa';
import { IProfile } from '../interfaces/IProfile';
import Percentage from './Percentage';

interface IProps {
  profile: IProfile,
  listProfiles: () => void,
  removeProfile: (username: string) => void
}

export default class ProfileList extends React.Component<IProps> {

  shouldComponentUpdate(nextProps: any, nextState: any) {
    return JSON.stringify(this.props) !== JSON.stringify(nextProps);
  }

  render() {

    let profile = this.props.profile;

    let progression: number = (profile.postsScrapped / profile.mediaCount) * 100;
    if (progression > 100) {
      progression = 100;
    }

    let barType: string = "warning";
    if (progression === 100) {
      barType = "success";
    }
    if (profile.scrapping) {
      barType = "info"
    }

    return (<ListGroupItem color={profile.isPrivate || profile.notFound ? 'danger' : ''}>

      <span className="float-right">
        <Button outline color="danger" size="sm" disabled={this.props.profile.isFixed} onClick={() => this.props.removeProfile(this.props.profile.username)}>
          <FaTrash />
        </Button>
      </span>

      <ProfileModal profile={profile}>
        <div className="profile-name">
          <a href={"#" + profile.username}>{
            profile.fullName ? profile.fullName : "loading..."
          }</a>
          <small>@{profile.username}</small>
        </div>
      </ProfileModal>

      {profile.isPrivate || profile.notFound ? <Label color="danger">(not found or private)</Label> : ""}

      <Row>
        <Col xs="6" sm="3">
          <small>Followed:</small><br />
          {profile.followedByCount.toLocaleString('pt-BR')} <br />
          <Percentage value={profile.followedByPercentage} />
        </Col>
        <Col xs="6" sm="3">
          <small>Posts:</small><br />
          {profile.mediaCount.toLocaleString('pt-BR')}  <br />
          <Percentage value={profile.mediaPercentage} />
        </Col>
        <Col xs="6" sm="3">
          <small>Likes:</small><br />
          {profile.likeCount.toLocaleString('pt-BR')}  <br />
          <Percentage value={profile.likePercentage} />
        </Col>
        <Col xs="6" sm="3">
          <small>Comments:</small><br />
          {profile.commentCount.toLocaleString('pt-BR')}  <br />
          <Percentage value={profile.commentPercentage} />
        </Col>
      </Row>

      <Progress value={progression} color={barType} striped={profile.scrapping} animated={profile.scrapping} />

    </ListGroupItem>);

  }
}

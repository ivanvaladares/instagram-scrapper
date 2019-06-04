import * as React from 'react';
import { TabContent, TabPane, Row, Col, Nav, NavItem, NavLink, Label, Alert } from 'reactstrap';
import { apiBackendUrl } from '../helpers/constants';
import PostsStatsList from './PostStatsList';
import { IProfile } from '../interfaces/IProfile';
import { IPost } from '../interfaces/IPost';
import '../css/PostStats.scss';
import LoadingBar from './LoadingBar';

interface IProps {
  profile: IProfile
}

export default class PostsStats extends React.Component<IProps> {

  public state = {
    isLoading: true,
    hasData: false,
    list1: [] as IPost[],
    list2: [] as IPost[],
    list3: [] as IPost[],
    activeTab: '1',
    error: false,
    errorMessage: ""
  }

  private toggle(tab: string) {
    this.setState({ activeTab: tab });
  }

  private loadData() {
    fetch(`${apiBackendUrl}post/getStats/${this.props.profile.username}?limit=30`).then(response => {

      if (!response.ok) {
        if (response.bodyUsed) {
          response.json().then(err => {
            this.setState({ error: true, errorMessage: err.message });
          });
        } else {
          this.setState({ error: true, errorMessage: response.statusText });
        }
        return null;
      }

      return response.json();

    }).then(data => {

      if (data === null) {
        this.setState({ isLoading: false });
        return;
      }

      this.setState({
        isLoading: false,
        hasData: data.topInteraction.length > 0 || data.topLikes.length > 0 || data.topComments.length > 0,
        list1: data.topInteraction,
        list2: data.topLikes,
        list3: data.topComments,
        activeTab: '1'
      });

    });
  }

  componentDidMount() {
    this.loadData();
  }

  render() {

    return <div>

      {this.state.isLoading && !this.state.error && <LoadingBar /> }

      {this.state.error && <Alert color="danger">{this.state.errorMessage}</Alert>}

      {!this.state.isLoading && !this.state.error && this.state.hasData &&
        <div>
          <Label>Top 30 interactions</Label>

          <Nav tabs>
            <NavItem>
              <NavLink
                className={this.state.activeTab === '1' ? "active" : ""}
                onClick={() => { this.toggle('1'); }}>
                Highlights
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={this.state.activeTab === '2' ? "active" : ""}
                onClick={() => { this.toggle('2'); }} >
                Likes
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={this.state.activeTab === '3' ? "active" : ""}
                onClick={() => { this.toggle('3'); }} >
                Comments
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
              <Row>
                <Col sm="12">
                  <PostsStatsList posts={this.state.list1} />
                </Col>
              </Row>
            </TabPane>
            <TabPane tabId="2">
              <Row>
                <Col sm="12">
                  <PostsStatsList posts={this.state.list2} />
                </Col>
              </Row>
            </TabPane>
            <TabPane tabId="3">
              <Row>
                <Col sm="12">
                  <PostsStatsList posts={this.state.list3} />
                </Col>
              </Row>
            </TabPane>
          </TabContent>
        </div>
      }

    </div>;

  }
}
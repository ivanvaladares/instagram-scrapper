import * as React from 'react';
import { Alert, Button, Modal, ModalHeader, ModalBody, ModalFooter, Label } from 'reactstrap';
import { FaExternalLinkAlt } from 'react-icons/fa';
import Highcharts from 'highcharts';
import highchartsSeriesLabel from "highcharts/modules/series-label";
import HighchartsReact from 'highcharts-react-official';
import { apiBackendUrl } from '../helpers/constants';
import { IPost } from '../interfaces/IPost';
import LoadingBar from './LoadingBar';


highchartsSeriesLabel(Highcharts);

interface IProps {
  post: IPost
}

export default class PostModal extends React.Component<IProps> {

  public state = {
    isLoading: true,
    hasData: false,
    isOpen: false,
    chartOptionsAndData: {},
    error: false,
    errorMessage: ""
  }

  private toggle() {
    if (!this.state.isOpen) {
      this.loadChart();
    }

    this.setState({ isOpen: !this.state.isOpen });
  }

  private loadChart() {
    fetch(`${apiBackendUrl}post/getChart/${this.props.post.path}`).then(response => {

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

      let chartOptionsAndData: Highcharts.Options = {
        chart: {
          type: 'spline',
          zoomType: 'x',
          panning: true,
          panKey: 'shift',
          resetZoomButton: {
            position: {
              align: 'left',
              verticalAlign: 'top',
              x: 0,
              y: -10
            }
          }
        },
        yAxis: [{
          labels: {
            style: {
              color: Highcharts.getOptions().colors[7]
            }
          },
          title: {
            text: 'Likes',
            style: {
              color: Highcharts.getOptions().colors[7]
            }
          }
        }, {
          labels: {
            style: {
              color: Highcharts.getOptions().colors[9]
            }
          },
          title: {
            text: 'Comments',
            style: {
              color: Highcharts.getOptions().colors[9]
            }
          },
          opposite: true
        }],
        xAxis: {
          type: 'datetime',
          showFirstLabel: true
        },
        series: [{
          name: 'Likes',
          type: 'spline',
          data: data.likesArr,
          color: Highcharts.getOptions().colors[1]
        }, {
          name: 'Comments',
          type: 'spline',
          data: data.commentsArr,
          yAxis: 1,
          color: Highcharts.getOptions().colors[9]
        }],
        plotOptions: { spline: { marker: { enabled: false } } },
        credits: { enabled: false },
        exporting: { enabled: false },
        title: { text: null },
        subtitle: { text: null }
      }

      this.setState({
        isLoading: false,
        hasData: data.likesArr.length > 0 ||
                 data.commentsArr.length > 0,
        chartOptionsAndData
      });


    });
  }

  render() {

    return <span onClick={(e) => { this.toggle(); e.preventDefault(); }}>

      {this.props.children}

      <Modal size="lg" toggle={() => this.toggle()} isOpen={this.state.isOpen} fade={true} keyboard={true}>
        <ModalHeader toggle={() => this.toggle()}>
          <a href={"https://instagram.com/p/" + this.props.post.path} target="_new">{this.props.post.path} <FaExternalLinkAlt size="0.8em" /></a>
        </ModalHeader>
        <ModalBody>

          {this.state.isLoading && !this.state.error && <LoadingBar /> }

          {!this.state.isLoading && !this.state.hasData && <Label>No data available</Label>}

          {this.state.error && <Alert color="danger">{this.state.errorMessage}</Alert>}

          {!this.state.isLoading && !this.state.error && this.state.hasData &&
            <HighchartsReact
              highcharts={Highcharts}
              options={this.state.chartOptionsAndData}
              callback={chart => {
                if (!this.state.isLoading && this.state.hasData && window.innerWidth < 800){
                  for (var i = 0; i < chart.yAxis.length; i++) {
                    chart.yAxis[i].update({
                          visible: false
                    });
                  }
                }
              }}
            />
          }

        </ModalBody>
        <ModalFooter>
          <Button color='default' onClick={() => this.toggle()}>Close</Button>
        </ModalFooter>
      </Modal>

    </span>;
  }
}
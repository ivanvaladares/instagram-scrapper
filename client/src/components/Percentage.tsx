import * as React from 'react';
import { Label } from 'reactstrap';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import '../css/Percentage.scss';

interface IProps {
  value: number
}

export default class Percentage extends React.Component<IProps> {

  shouldComponentUpdate(nextProps: any) {
    return nextProps.value !== undefined && !isNaN(nextProps.value);
  }

  render() {

    return <span>

      {this.props.value >= 0.1 &&
        <Label className="percUp"><FaArrowUp size="0.8em" />{this.props.value.toFixed(1)}%</Label>}

      {this.props.value <= -0.1 &&
        <Label className="percDown"><FaArrowDown size="0.8em" />{this.props.value.toFixed(1)}%</Label>}

    </span>
  }
}
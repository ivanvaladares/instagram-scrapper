import * as React from 'react';
import { Button, Modal, ModalBody, ModalFooter, Form, InputGroup, InputGroupAddon, Input } from 'reactstrap';
import { FaPlus, FaUserPlus } from 'react-icons/fa';
import '../css/FormModal.scss';

interface IProps {
  saveProfile: (username: string) => void
}

export default class FormModal extends React.Component<IProps> {

  public state = {
    isOpen: false,
    username: ""
  }

  private updateInputValue (evt: any) {
    this.setState({
      username: evt.target.value
    });
  }

  private saveProfile (evt: any) {

    if (this.state.username.split(" ").join("") === "") {
      return alert("Please type the username");
    }

    this.props.saveProfile(this.state.username); 
    this.setState({username: "" });
    this.toggle();
    evt.preventDefault();
  }

  private toggle() {
    this.setState({ isOpen: !this.state.isOpen });
  }

  render() {

    return <span onClick={(e) => { this.toggle(); e.preventDefault(); }}>

      <a href="#addNew" className="float">
        <FaPlus className="my-float" />
      </a>

      <Modal size="md" toggle={() => this.toggle()} isOpen={this.state.isOpen} fade={true} keyboard={true}>
        <ModalBody>

          <Form onSubmit={(e) => { this.saveProfile(e); }}>
            <InputGroup>
              <InputGroupAddon addonType="prepend" className="input-group-text"><FaUserPlus />&nbsp; add new @</InputGroupAddon>
              <Input placeholder="instagram username" value={this.state.username} onChange={evt => this.updateInputValue(evt)} />
            </InputGroup>
          </Form>

        </ModalBody>
        <ModalFooter>
          <Button color='default' onClick={() => this.toggle()}>Close</Button>
          <Button color="success" onClick={(e) => { this.saveProfile(e) }}>Save</Button>
        </ModalFooter>
      </Modal>

    </span>;
  }
}
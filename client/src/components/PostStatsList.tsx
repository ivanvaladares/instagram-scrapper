import * as React from 'react';
import Percentage from './Percentage';
import { IPost } from '../interfaces/IPost';
import PostModal from './PostModal';
import '../css/PostStatsList.scss';

interface IProps {
  posts: IPost[]
}
export default class PostsStatsList extends React.Component<IProps> {

  render() {

    const postList = this.props.posts.map(post => {
      return <tr key={post.path} >
        <td>
          <PostModal post={post}>
            <a href={"#" + post.path}>{post.path}</a>
          </PostModal>
          
          <br />
          <small>{post.published === 0 ? "today" :
            post.published + (post.published > 1 ? " days " : " day ") + " ago"}</small>
        </td>
        <td>
          Likes: {post.likeCount.toLocaleString('pt-BR')}&nbsp;
          <Percentage value={post.likePercentage} />
          <br />
          Comments: {post.commentCount.toLocaleString('pt-BR')}&nbsp;
          <Percentage value={post.commentPercentage} />
        </td>

      </tr>
    });

    return <div>

      <table className="table table-bordered">
        <thead>
          <tr>
            <td className="postPathCol">Post</td>
            <td>Stats</td>
          </tr>
        </thead>
        <tbody>
          {postList}
        </tbody>
      </table>

    </div>;

  }
}
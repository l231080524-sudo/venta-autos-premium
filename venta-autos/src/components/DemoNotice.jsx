import parse from 'html-react-parser';
import noticeHtml from './DemoNotice.html?raw';

const notice = parse(noticeHtml);

export default function DemoNotice() {
  return notice;
}

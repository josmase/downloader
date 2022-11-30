import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <form action="/api/video" method="GET">
        <div className={styles.group}>
          <label htmlFor="url">Youtube URL</label>
          <input type="test" id="url" name="url" required />
        </div>
        <div className={styles.group}>
          <label htmlFor="format">Format</label>
          <select id="format" name="format" required>
            <option value="audiovideo">Video and audio</option>
            <option value="audio">Audio only</option>
            <option value="video">Video only</option>
          </select>
        </div>
        <div className={styles.group}>
          <label htmlFor="quality">Quality</label>
          <select id="quality" name="quality" required>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className={styles.group}>
          <button type="submit">Start download</button>
        </div>
      </form>
    </div>
  );
}

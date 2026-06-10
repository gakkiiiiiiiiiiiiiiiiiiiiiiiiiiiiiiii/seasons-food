<script>
import { initCloudContainer } from './utils/request'

export default {
  onLaunch() {
    initCloudContainer()
  }
}
</script>

<style>
@import "./styles.css";

page {
  min-height: 100%;
  background: #f6f0e6;
}
</style>

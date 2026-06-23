const SAMPLE_XML = `<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
  <channel>
    <title>Sample RSS Video</title>
    <link>http://rssvideoplayer.com/sample.xml</link>
    <language>en-us</language>
    <item>
      <title>Big Buck Bunny</title>
      <link>http://www.bigbuckbunny.org</link>
      <pubDate>Sun, 01 Jun 2014 00:00:00 GMT</pubDate>
      <description><![CDATA[<img src='http://peach.blender.org/wp-content/uploads/title_anouncement.jpg' /> Big Buck Bunny Animation]]></description>
      <enclosure url="http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4" type="video/mp4" length="8748136" />
      <media:thumbnail url="http://peach.blender.org/wp-content/uploads/title_anouncement.jpg"/>
      <itunes:image href="http://peach.blender.org/wp-content/uploads/title_anouncement.jpg"/>
    </item>
    <item>
      <title>HTTP Live Streaming - Apple Demo</title>
      <link>http://apple.com</link>
      <pubDate>Sun, 01 Jun 2014 00:00:00 GMT</pubDate>
      <bookmark>true</bookmark>
      <enclosure url="http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8" type="application/x-mpegurl" length="1"/>
      <media:thumbnail url="http://rssvideoplayer.com/play.png"/>
      <itunes:image href="http://rssvideoplayer.com/play.png"/>
    </item>
  </channel>
</rss>`;

module.exports = { SAMPLE_XML };

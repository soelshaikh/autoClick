import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  Keyboard,
  Alert,
  ScrollView,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('coursera');
  const [urls, setUrls] = useState<string>('coursera.org');
  const [proxyType, setProxyType] = useState<string>(''); // Proxy type (http, https, socks5)
  const [proxyAddress, setProxyAddress] = useState<string>(''); // Proxy address
  const [proxyPort, setProxyPort] = useState<string>(''); // Proxy port
  const [proxyUsername, setProxyUsername] = useState<string>(''); // Proxy username
  const [proxyPassword, setProxyPassword] = useState<string>(''); // Proxy password
  const [clicks, setClicks] = useState<number>(5); // Number of clicks
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [isWebViewVisible, setIsWebViewVisible] = useState<boolean>(false);
  
  const webViewRef = useRef<WebView>(null); // Ref for WebView

  const handleSearch = (): void => {
    Keyboard.dismiss();

    // Construct the search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      searchTerm,
    )}`;

    // Check if proxy details are provided
    let finalUrl = searchUrl;
    if (proxyType && proxyAddress && proxyPort) {
      // Construct proxy URL
      const proxyUrl = `${proxyType}://${proxyUsername}:${proxyPassword}@${proxyAddress}:${proxyPort}`;
      finalUrl = `${proxyUrl}/proxy?url=${encodeURIComponent(searchUrl)}`;
    }

    setWebviewUrl(finalUrl);
    setIsWebViewVisible(true);

    // Show an alert with instructions if proxy is provided
    if (proxyType && proxyAddress && proxyPort) {
      Alert.alert(
        'Proxy Configuration',
        'Please configure your device proxy settings to use the provided proxy server for the WebView to work correctly.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleClear = (): void => {
    setWebviewUrl(null);
    setIsWebViewVisible(false);
  };

  const injectedJavaScript = `
  (function() {
    var urls = ${JSON.stringify(
      urls.split(',').map(url => url.trim().toLowerCase())
    )};
    var clickCount = 0;
    var maxClicks = ${clicks};
    var noMatchingSponsoredLink = true;
  
    function clickAndReturnHome() {
      if (clickCount >= maxClicks) {
        console.log('Max clicks reached.');
        return;
      }
  
      var links = document.getElementsByTagName('a');
      console.log("Found links:", links);
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var linkUrl = link.href.toLowerCase();
  
        // Check if the link is sponsored by checking specific class names
        var sponsoredClassNames = ['U3A9Ac', 'qV8iec'];
        var isSponsored = Array.from(link.getElementsByTagName('span')).some(span =>
          sponsoredClassNames.some(className => span.classList.contains(className))
        );
  
        if (isSponsored) {
          console.log("Checking sponsored link:", linkUrl);
  
          for (var j = 0; j < urls.length; j++) {
            if (linkUrl.includes(urls[j])) {
              console.log("Clicking on sponsored URL:", linkUrl);
              noMatchingSponsoredLink = false;
              link.scrollIntoView();
              try {
                link.click();
                clickCount++;
                console.log('Click count:', clickCount);
                setTimeout(() => {
                  window.location.href = 'https://www.google.com/search?q=${encodeURIComponent(
                    searchTerm
                  )}';
                  setTimeout(clickAndReturnHome, 3000);
                }, 3000);
              } catch (error) {
                console.error("Error clicking link:", error);
              }
              return;
            }
          }
        }
      }
  
      if (noMatchingSponsoredLink) {
        console.log('No matching sponsored link found.');
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }
  
    clickAndReturnHome();
  })();
  `;
  

  const onMessage = (event: any) => {
    const { data } = event.nativeEvent;
    if (data === 'noMatchingSponsoredLink') {
      handleClear(); // Trigger the back action
    }
  };

  const onNavigationStateChange = (navState: WebViewNavigation): void => {
    console.log('Current URL:', navState.url);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.title}>Search and URL Checker</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter search term"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter URLs (comma-separated)"
          value={urls}
          onChangeText={setUrls}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter proxy type (http, https, socks5) or leave blank"
          value={proxyType}
          onChangeText={setProxyType}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter proxy address (e.g., proxyserver.com) or leave blank"
          value={proxyAddress}
          onChangeText={setProxyAddress}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter proxy port (e.g., 8080) or leave blank"
          value={proxyPort}
          onChangeText={setProxyPort}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter proxy username or leave blank"
          value={proxyUsername}
          onChangeText={setProxyUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter proxy password or leave blank"
          value={proxyPassword}
          onChangeText={setProxyPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Enter number of clicks"
          value={clicks.toString()}
          onChangeText={text => setClicks(parseInt(text, 10) || 0)}
          keyboardType="numeric"
        />
        <Button title="Submit" onPress={handleSearch} />
      </ScrollView>
      {isWebViewVisible && webviewUrl && (
        <View style={styles.webViewContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClear}>
            <Text>Back</Text>
          </TouchableOpacity>
          <WebView
            ref={webViewRef}
            source={{ uri: webviewUrl }}
            style={{ flex: 1 }}
            injectedJavaScript={injectedJavaScript}
            onNavigationStateChange={onNavigationStateChange}
            onMessage={onMessage}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  webViewContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'white',
  },
  cancelButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    zIndex: 2,
  },
});

export default App;

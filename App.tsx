import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  Keyboard,
  Alert,
  FlatList,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('coursera');
  const [urls, setUrls] = useState<string>('coursera.org');
  const [proxySettingsVisible, setProxySettingsVisible] = useState<boolean>(false);
  const [proxyType, setProxyType] = useState<string>(''); // Proxy type (http, https, socks5)
  const [proxyAddress, setProxyAddress] = useState<string>(''); // Proxy address
  const [proxyPort, setProxyPort] = useState<string>(''); // Proxy port
  const [proxyUsername, setProxyUsername] = useState<string>(''); // Proxy username
  const [proxyPassword, setProxyPassword] = useState<string>(''); // Proxy password
  const [clicks, setClicks] = useState<number>(5); // Number of clicks
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [isWebViewVisible, setIsWebViewVisible] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<{ term: string; urls: string }[]>([
    { term: 'coursera', urls: 'coursera.org' },
    { term: 'udemy', urls: 'udemy.com' },
    { term: 'i phone xr', urls: 'flip.com' },
    { term: 'test4', urls: 'example4.com' },
  ]);

  const webViewRef = useRef<WebView>(null); // Ref for WebView

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async (): Promise<void> => {
    try {
      const historyJson = await AsyncStorage.getItem('searchHistory');
      if (historyJson) {
        setSearchHistory(JSON.parse(historyJson).slice(-4));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const saveSearchHistory = async (newSearch: { term: string; urls: string }): Promise<void> => {
    try {
      // Check for duplicates before saving
      const isDuplicate = searchHistory.some(
        (item) => item.term === newSearch.term && item.urls === newSearch.urls
      );
      if (!isDuplicate) {
        const updatedHistory = [...searchHistory, newSearch].slice(-4);
        await AsyncStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
        setSearchHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const handleSearch = (): void => {
    Keyboard.dismiss();

    // Construct the search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;

    // Check if proxy details are provided
    let finalUrl = searchUrl;
    if (proxyType && proxyAddress && proxyPort) {
      // Construct proxy URL
      const proxyUrl = `${proxyType}://${proxyUsername}:${proxyPassword}@${proxyAddress}:${proxyPort}`;
      finalUrl = `${proxyUrl}/proxy?url=${encodeURIComponent(searchUrl)}`;
    }

    setWebviewUrl(finalUrl);
    setIsWebViewVisible(true);

    // Save the search to history if not a duplicate
    saveSearchHistory({ term: searchTerm, urls });

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
    setSearchTerm('');
    setUrls('');
    setProxyType('');
    setProxyAddress('');
    setProxyPort('');
    setProxyUsername('');
    setProxyPassword('');
    setClicks(1);
    setWebviewUrl(null);
    setIsWebViewVisible(false);
  };

  const handleHistoryClick = (item: { term: string; urls: string }): void => {
    setSearchTerm(item.term);
    setUrls(item.urls);
  };

  const injectedJavaScript = `
  (function() {
    var urls = ${JSON.stringify(urls.split(',').map(url => url.trim().toLowerCase()))};
    var clickCount = 0;
    var maxClicks = ${clicks};
    var noMatchingSponsoredLink = true;

    function backtoHome() {
      return new Promise(resolve => {
        setTimeout(() => {
          window.location.href = 'https://www.google.com/search?q=${encodeURIComponent(searchTerm)}';
          setTimeout(clickAndReturnHome, 3000); // Wait before the next click
        }, 3000); // Wait before going back
        resolve();
      });
    }

    async function clickAndReturnHome() {
      if (clickCount >= maxClicks) {
        alert('Max clicks reached.');
        window.ReactNativeWebView.postMessage("noMatchingSponsoredLink");
        return;
      }

      var links = document.getElementsByTagName('a');
      console.log("Found links:", links);
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var linkUrl = link.href.toLowerCase();
        var linkClicked = false;
        var sponsoredClassNames = ['U3A9Ac', 'qV8iec'];
        var isSponsored = Array.from(link.getElementsByTagName('span')).some(span =>
          sponsoredClassNames.some(className => span.classList.contains(className))
        );

        if (isSponsored) {
          console.log("Checking sponsored link:", linkUrl);
          for (var j = 0; j < urls.length*100; j++) {
            if (linkUrl.includes(urls[j])) {
              console.log("Clicking on sponsored URL:", linkUrl);
              noMatchingSponsoredLink = false;
              link.scrollIntoView();
              try {
                link.focus();
                link.click();
                linkClicked = true;
                clickCount++;
                
                return;
              } catch (error) {
                console.error("Error clicking link:", error);
                return;
              }
            }
          }
        }
      }

      const currentPageUrl = window.location.href;
      if (currentPageUrl.startsWith('https://www.google.com/search?') && noMatchingSponsoredLink) {
        alert(\`No matching sponsored link found. Current page URL: \${currentPageUrl}\`);
        window.ReactNativeWebView.postMessage("noMatchingSponsoredLink");
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

  // Determine if submit button should be enabled
  const isSubmitDisabled = !searchTerm.trim() || !urls.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search and URL Checker</Text>
      <Text style={styles.historyTitle}>Last 4 Searches:</Text>
      <FlatList
        data={searchHistory}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleHistoryClick(item)} style={styles.historyItem}>
            <View>
              <Text style={styles.historyTerm}>Search Term: {item.term}</Text>
              <Text style={styles.historyUrls}>URLs: {item.urls}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
        placeholder="Enter number of clicks"
        value={clicks.toString()}
        onChangeText={text => setClicks(parseInt(text, 10) || 0)}
        keyboardType="numeric"
      />
      <TouchableOpacity onPress={() => setProxySettingsVisible(!proxySettingsVisible)} style={styles.toggleButton}>
        <Text style={styles.toggleButtonText}>{proxySettingsVisible ? 'Hide Proxy Settings' : 'Show Proxy Settings'}</Text>
      </TouchableOpacity>
      {proxySettingsVisible && (
        <View style={styles.proxySettingsContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter proxy type (e.g., http, https, socks5)"
            value={proxyType}
            onChangeText={setProxyType}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter proxy address"
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
        </View>
      )}
      <Button title="Submit" onPress={handleSearch} disabled={isSubmitDisabled} />
      <Button title="Clear" onPress={handleClear} color="red" />
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  toggleButton: {
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    marginBottom: 10,
  },
  toggleButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  proxySettingsContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  historyItem: {
    padding: 10,
    borderColor: '#007bff',
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 5,
    backgroundColor: '#f0f8ff',
  },
  historyTerm: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  historyUrls: {
    fontSize: 14,
    color: '#333',
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
    padding: 10,
    backgroundColor: 'red',
    borderRadius: 5,
  },
});

export default App;

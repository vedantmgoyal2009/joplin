const React = require('react');
import Setting from '@joplin/lib/models/Setting';
import { useEffect, useMemo, useState } from 'react';
import { View, Dimensions, Alert, Button } from 'react-native';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { SensorInfo } from './sensorInfo';
import { _ } from '@joplin/lib/locale';

interface Props {
	themeId: number;
	sensorInfo: SensorInfo;
}

export default (props: Props) => {
	const [initialPromptDone, setInitialPromptDone] = useState(Setting.value('security.biometricsInitialPromptDone'));
	const [display, setDisplay] = useState(!!props.sensorInfo.supportedSensors && (props.sensorInfo.enabled || !initialPromptDone));
	const [tryBiometricsCheck, setTryBiometricsCheck] = useState(initialPromptDone);

	useEffect(() => {
		if (!display || !tryBiometricsCheck) return;

		const biometricsCheck = async () => {
			try {
				await FingerprintScanner.authenticate({ description: _('Verify your identity') });
				setTryBiometricsCheck(false);
				setDisplay(false);
			} catch (error) {
				Alert.alert(_('Could not verify your identify'), error.message);
				setTryBiometricsCheck(false);
			} finally {
				FingerprintScanner.release();
			}
		};

		void biometricsCheck();
	}, [display, tryBiometricsCheck]);

	useEffect(() => {
		if (initialPromptDone) return;
		if (!display) return;

		const complete = (enableBiometrics: boolean) => {
			setInitialPromptDone(true);
			Setting.setValue('security.biometricsInitialPromptDone', true);
			Setting.setValue('security.biometricsEnabled', enableBiometrics);
			if (!enableBiometrics) {
				setDisplay(false);
				setTryBiometricsCheck(false);
			} else {
				setTryBiometricsCheck(true);
			}
		};

		Alert.alert(
			_('Enable biometrics authentication?'),
			_('Use your biometrics to secure access to your application. You can always set it up later in Settings.'),
			[
				{
					text: _('Enable'),
					onPress: () => complete(true),
					style: 'default',
				},
				{
					text: _('Not now'),
					onPress: () => complete(false),
					style: 'cancel',
				},
			]
		);
	}, [initialPromptDone, props.sensorInfo.supportedSensors, display]);

	const windowSize = useMemo(() => {
		return {
			width: Dimensions.get('window').width,
			height: Dimensions.get('window').height,
		};
	}, []);

	const renderTryAgainButton = () => {
		if (!display || tryBiometricsCheck || !initialPromptDone) return null;
		return <Button title={_('Try again')} onPress={() => setTryBiometricsCheck(true)} />;
	};

	return (
		<View style={{ display: display ? 'flex' : 'none', position: 'absolute', zIndex: 99999, backgroundColor: '#000000', width: windowSize.width, height: windowSize.height }}>
			{renderTryAgainButton()}
		</View>
	);
};

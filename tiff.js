/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function TIFFParser() {
	this.tiffDataView = undefined;
	this.littleEndian = undefined;
	this.fileDirectories = [];
};

TIFFParser.prototype = {
	isLittleEndian: function () {
		// Get byte order mark.
		var BOM = this.getBytes(2, 0);

		// Find out the endianness.
		if (BOM === 0x4949) {
			this.littleEndian = true;
		} else if (BOM === 0x4D4D) {
			this.littleEndian = false;
		} else {
			console.log( BOM );
			throw TypeError("Invalid byte order value.");
		}

		return this.littleEndian;
	},

	hasTowel: function () {
		// Check for towel.
		if (this.getBytes(2, 2) !== 42) {
			throw RangeError("You forgot your towel!");
			return false;
		}

		return true;
	},

	getFieldTagName: function (fieldTag) {
		// See: http://www.digitizationguidelines.gov/guidelines/TIFF_Metadata_Final.pdf
		// See: http://www.digitalpreservation.gov/formats/content/tiff_tags.shtml
		const fieldTagNames = {
			// TIFF Baseline
			0x013B: 'Artist',
			0x0102: 'BitsPerSample',
			0x0109: 'CellLength',
			0x0108: 'CellWidth',
			0x0140: 'ColorMap',
			0x0103: 'Compression',
			0x8298: 'Copyright',
			0x0132: 'DateTime',
			0x0152: 'ExtraSamples',
			0x010A: 'FillOrder',
			0x0121: 'FreeByteCounts',
			0x0120: 'FreeOffsets',
			0x0123: 'GrayResponseCurve',
			0x0122: 'GrayResponseUnit',
			0x013C: 'HostComputer',
			0x010E: 'ImageDescription',
			0x0101: 'ImageLength',
			0x0100: 'ImageWidth',
			0x010F: 'Make',
			0x0119: 'MaxSampleValue',
			0x0118: 'MinSampleValue',
			0x0110: 'Model',
			0x00FE: 'NewSubfileType',
			0x0112: 'Orientation',
			0x0106: 'PhotometricInterpretation',
			0x011C: 'PlanarConfiguration',
			0x0128: 'ResolutionUnit',
			0x0116: 'RowsPerStrip',
			0x0115: 'SamplesPerPixel',
			0x0131: 'Software',
			0x0117: 'StripByteCounts',
			0x0111: 'StripOffsets',
			0x00FF: 'SubfileType',
			0x0107: 'Threshholding',
			0x011A: 'XResolution',
			0x011B: 'YResolution',

			// TIFF Extended
			0x0146: 'BadFaxLines',
			0x0147: 'CleanFaxData',
			0x0157: 'ClipPath',
			0x0148: 'ConsecutiveBadFaxLines',
			0x01B1: 'Decode',
			0x01B2: 'DefaultImageColor',
			0x010D: 'DocumentName',
			0x0150: 'DotRange',
			0x0141: 'HalftoneHints',
			0x015A: 'Indexed',
			0x015B: 'JPEGTables',
			0x011D: 'PageName',
			0x0129: 'PageNumber',
			0x013D: 'Predictor',
			0x013F: 'PrimaryChromaticities',
			0x0214: 'ReferenceBlackWhite',
			0x0153: 'SampleFormat',
			0x022F: 'StripRowCounts',
			0x014A: 'SubIFDs',
			0x0124: 'T4Options',
			0x0125: 'T6Options',
			0x0145: 'TileByteCounts',
			0x0143: 'TileLength',
			0x0144: 'TileOffsets',
			0x0142: 'TileWidth',
			0x012D: 'TransferFunction',
			0x013E: 'WhitePoint',
			0x0158: 'XClipPathUnits',
			0x011E: 'XPosition',
			0x0211: 'YCbCrCoefficients',
			0x0213: 'YCbCrPositioning',
			0x0212: 'YCbCrSubSampling',
			0x0159: 'YClipPathUnits',
			0x011F: 'YPosition',

			// EXIF
			0x9202: 'ApertureValue',
			0xA001: 'ColorSpace',
			0x9004: 'DateTimeDigitized',
			0x9003: 'DateTimeOriginal',
			0x8769: 'Exif IFD',
			0x9000: 'ExifVersion',
			0x829A: 'ExposureTime',
			0xA300: 'FileSource',
			0x9209: 'Flash',
			0xA000: 'FlashpixVersion',
			0x829D: 'FNumber',
			0xA420: 'ImageUniqueID',
			0x9208: 'LightSource',
			0x927C: 'MakerNote',
			0x9201: 'ShutterSpeedValue',
			0x9286: 'UserComment',

			// IPTC
			0x83BB: 'IPTC',

			// ICC
			0x8773: 'ICC Profile',

			// XMP
			0x02BC: 'XMP',

			// GDAL
			0xA480: 'GDAL_METADATA',
			0xA481: 'GDAL_NODATA',

			// Photoshop
			0x8649: 'Photoshop',
		};

		var fieldTagName;

		if (fieldTag in fieldTagNames) {
			fieldTagName = fieldTagNames[fieldTag];
		} else {
			console.log( "Unknown Field Tag:", fieldTag);
			fieldTagName = "Tag" + fieldTag;
		}

		return fieldTagName;
	},

	getFieldTypeName: function (fieldType) {
		const fieldTypeNames = {
			0x0001: 'BYTE',
			0x0002: 'ASCII',
			0x0003: 'SHORT',
			0x0004: 'LONG',
			0x0005: 'RATIONAL',
			0x0006: 'SBYTE',
			0x0007: 'UNDEFINED',
			0x0008: 'SSHORT',
			0x0009: 'SLONG',
			0x000A: 'SRATIONAL',
			0x000B: 'FLOAT',
			0x000C: 'DOUBLE',
		};

		var fieldTypeName;

		if (fieldType in fieldTypeNames) {
			fieldTypeName = fieldTypeNames[fieldType];
		}

		return fieldTypeName;
	},

	getFieldTypeLength: function (fieldTypeName) {
		var fieldTypeLength;

		if (['BYTE', 'ASCII', 'SBYTE', 'UNDEFINED'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 1;
		} else if (['SHORT', 'SSHORT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 2;
		} else if (['LONG', 'SLONG', 'FLOAT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 4;
		} else if (['RATIONAL', 'SRATIONAL', 'DOUBLE'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 8;
		}

		return fieldTypeLength;
	},

	getBytes: function (numBytes, offset) {
		if (numBytes === 1) {
			return this.tiffDataView.getUint8(offset, this.littleEndian);
		} else if (numBytes === 2) {
			return this.tiffDataView.getUint16(offset, this.littleEndian);
		} else if (numBytes === 4) {
			return this.tiffDataView.getUint32(offset, this.littleEndian);
//		} else if (numBytes === 8) {
//			return this.tiffDataView.getUint64(offset, this.littleEndian);
		} else {
			console.log( numBytes, offset );
			throw RangeError("Number of bytes requested out of range");
		}
	},

	getFieldValues: function (fieldTagName, fieldTypeName, typeCount, valueOffset) {
		var fieldValues = [];

		var fieldTypeLength = this.getFieldTypeLength(fieldTypeName);
		var fieldValueSize = fieldTypeLength * typeCount;

		if (fieldValueSize <= 4) {
			fieldValues.push(valueOffset);
		} else {
			for (var i = 0; i < typeCount; i++) {
				var indexOffset = fieldTypeLength * i;

				if (fieldTypeLength >= 8) {
					if (['RATIONAL', 'SRATIONAL'].indexOf(fieldTypeName) !== -1) {
						// Numerator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset));
						// Denominator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset + 4));
//					} else if (['DOUBLE'].indexOf(fieldTypeName) !== -1) {
//						fieldValues.push(this.getBytes(4, valueOffset + indexOffset) + this.getBytes(4, valueOffset + indexOffset + 4));
					} else {
						console.log( fieldTypeName, typeCount, fieldValueSize );
						throw TypeError("Can't handle this field type or size");
					}
				} else {
					fieldValues.push(this.getBytes(fieldTypeLength, valueOffset + indexOffset));
				}
			}
		}

		if (fieldTypeName === 'ASCII') {
			fieldValues.forEach(function(e, i, a) { a[i] = String.fromCharCode(e); });
		}

		return fieldValues;
	},

	makeRGBFillValue: function(r, g, b) {
		return "rgb(" + r + ", " + g + ", " + b + ")";
	},

	parseFileDirectory: function (byteOffset) {
		var numDirEntries = this.getBytes(2, byteOffset);

		var tiffFields = [];

		for (var i = byteOffset + 2, entryCount = 0; entryCount < numDirEntries; i += 12, entryCount++) {
			var fieldTag = this.getBytes(2, i);
			var fieldType = this.getBytes(2, i + 2);
			var typeCount = this.getBytes(4, i + 4);
			var valueOffset = this.getBytes(4, i + 8);

			var fieldTagName = this.getFieldTagName( fieldTag );
			var fieldTypeName = this.getFieldTypeName( fieldType );

			var fieldValues = this.getFieldValues(fieldTagName, fieldTypeName, typeCount, valueOffset);

//			console.log( fieldTagName + ' (0x' + fieldTag.toString(16).toUpperCase() + ')', fieldTypeName + ' (' + fieldType + ')', typeCount, valueOffset, '0x' + valueOffset.toString(16).toUpperCase() );

			tiffFields[fieldTagName] = { 'type': fieldTypeName, 'values': fieldValues };
		}

		this.fileDirectories.push( tiffFields );

		var nextIFDByteOffset = this.getBytes(4, i);

		if (nextIFDByteOffset === 0x00000000) {
			return this.fileDirectories;
		} else {
			return this.parseFileDirectory(nextIFDByteOffset);
		}
	},

	parseTIFF: function (tiffArrayBuffer, canvas = document.createElement("canvas")) {
		this.tiffDataView = new DataView(tiffArrayBuffer);
		this.canvas = canvas;

		this.littleEndian = this.isLittleEndian(this.tiffDataView);

		if (!this.hasTowel(this.tiffDataView, this.littleEndian)) {
			return;
		}

		var firstIFDByteOffset = this.getBytes(4, 4);

		this.fileDirectories = this.parseFileDirectory(firstIFDByteOffset);

		var fileDirectory = this.fileDirectories[0];

		console.log( fileDirectory );

		var imageWidth = fileDirectory.ImageWidth.values[0];
		var imageLength = fileDirectory.ImageLength.values[0];

		this.canvas.width = imageWidth;
		this.canvas.height = imageLength;

		var strips = [];

		var samplesPerPixel = fileDirectory.SamplesPerPixel.values[0];

		var bytesPerSampleValues = [];
		var bytesPerPixel = 0;

		fileDirectory.BitsPerSample.values.forEach(function(bitsPerSample, i, bitsPerSampleValues) {
			// XXX: Could we handle odd bit lengths?
			if ( bitsPerSample % 8 !== 0 ) {
				throw RangeError("Cannot handle sub-byte bits per sample");
				return;
			}

			bytesPerSampleValues[i] = bitsPerSample / 8;
			bytesPerPixel += bytesPerSampleValues[i];
		}, this);

		var stripByteCountValues = fileDirectory.StripByteCounts.values;

		// Loop through strips.
		fileDirectory.StripOffsets.values.forEach(function(stripOffset, i, stripOffsetValues) {
			strips[i] = [];

			var stripByteCount = stripByteCountValues[i];

			// Loop through pixels.
			for (var j = 0; j < stripByteCount; j += bytesPerPixel) {
				// Loop through samples (sub-pixels).
				for (var k = 0, pixel = []; k < samplesPerPixel; k++) {
					var sampleOffset = bytesPerSampleValues[k] * k;
					pixel.push(this.getBytes(bytesPerSampleValues[k], stripOffset + j + sampleOffset));

					/*if (this.littleEndian) {
						pixel.reverse();
					}*/
				}

				strips[i].push(pixel);
			}

//			console.log( strips[i] );
		}, this);

//		console.log( strips );

		if (canvas.getContext) {
			var ctx = this.canvas.getContext("2d");

			// Set a default fill style.
			ctx.fillStyle = this.makeRGBFillValue(255, 255, 255);

			var numStrips = strips.length;
			var rowsPerStrip = fileDirectory.RowsPerStrip.values[0];
			var imageLengthModRowsPerStrip = imageLength % rowsPerStrip;
			var rowsInLastStrip = (imageLengthModRowsPerStrip === 0) ? rowsPerStrip : imageLengthModRowsPerStrip;

			var numRowsInStrip = rowsPerStrip;
			var numRowsInPreviousStrip = 0;

			for (var i = 0; i < numStrips; i++) {
				// The last strip may be short.
				if ((i + 1) === numStrips) {
					numRowsInStrip = rowsInLastStrip;
				}

				var numPixels = strips[i].length;
				var yPadding = numRowsInPreviousStrip * i;

				for (var y = 0, j = 0; y < numRowsInStrip, j < numPixels; y++) {
					for (var x = 0; x < imageWidth; x++, j++) {
						var pixelSamples = strips[i][j];
						switch (fileDirectory.PhotometricInterpretation.values[0]) {
							// Bilevel or Grayscale
							// WhiteIsZero
							case 0:
								var invertValue = Math.pow(0x10, bytesPerSampleValues[0] * 2);

								// Invert samples.
								pixelSamples.forEach(function(sample, index, samples) { samples[index] = invertValue - sample; });

							// Bilevel or Grayscale
							// BlackIsZero
							case 1:
								var shade = pixelSamples[0];

								ctx.fillStyle = this.makeRGBFillValue(shade, shade, shade);
							break;

							// RGB Full Color
							case 2:
								if (fileDirectory.ExtraSamples) {
									//ctx.fillStyle = ;
								} else {
									ctx.fillStyle = this.makeRGBFillValue(pixelSamples[0], pixelSamples[1], pixelSamples[2]);
								}
							break;

							// RGB Color Palette
							case 3:
							break;

							// Transparency mask
							case 4:
							break;

							// CMYK
							case 5:
							break;

							// YCbCr
							case 6:
							break;

							// CIELab
							case 8:
							break;

							// Unknown Photometric Interpretation
							default:
							break;
						}

						ctx.fillRect(x, yPadding + y, 1, 1);
					}
				}

				numRowsInPreviousStrip = numRowsInStrip;
			}
		}

/*		for (var i = 0, numFileDirectories = this.fileDirectories.length; i < numFileDirectories; i++) {
			// Stuff
		}*/

		return this.canvas;
	},
}
